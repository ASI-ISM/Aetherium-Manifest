import asyncio
import json
import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

# Import the core logic from the original file
# We'll copy the constants and classes to make it truly standalone
from runtime_governor import RuntimeGovernor, GovernorContext, GovernorDecision

# Messaging clients
try:
    import nats
    from nats.js.errors import NoSuchStreamError
except ImportError:
    nats = None

try:
    from confluent_kafka import Producer
except ImportError:
    Producer = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("governor")

app = FastAPI(title="Aetherium Governor Service")

# Configuration from environment
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")
SCHEMA_PATH = os.getenv("PARTICLE_CONTRACT_SCHEMA_PATH", "particle-control.schema.json")
GOVERNOR_POLICY_STRICT = os.getenv("GOVERNOR_POLICY_STRICT", "true").lower() == "true"

# Global clients
nc = None
js = None
kp = None

class GovernorRequest(BaseModel):
    payload: Dict[str, Any]
    context: Dict[str, Any] = Field(default_factory=dict)

@app.on_event("startup")
async def startup_event():
    global nc, js, kp

    # Initialize NATS
    if nats:
        try:
            nc = await nats.connect(NATS_URL)
            js = nc.jetstream()
            logger.info(f"Connected to NATS at {NATS_URL}")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")

    # Initialize Kafka
    if Producer:
        try:
            kp = Producer({"bootstrap.servers": KAFKA_BROKERS})
            logger.info(f"Connected to Kafka at {KAFKA_BROKERS}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if nc:
        await nc.close()
    if kp:
        kp.flush()

def publish_audit_log(decision: Dict[str, Any]):
    if kp:
        try:
            trace_id = decision.get("trace_id", "unknown")
            kp.produce(
                "governor-audit-log",
                key=trace_id,
                value=json.dumps(decision).encode("utf-8")
            )
            kp.poll(0)
        except Exception as e:
            logger.error(f"Failed to publish to Kafka: {e}")

async def publish_visual_command(room_id: str, envelope: Dict[str, Any]):
    if js:
        try:
            subject = f"visual.commands.global.{room_id}"
            await js.publish(subject, json.dumps(envelope).encode("utf-8"))
        except Exception as e:
            logger.error(f"Failed to publish to NATS: {e}")

@app.post("/api/v1/governor/process")
async def process_contract(request: GovernorRequest, background_tasks: BackgroundTasks):
    schema_p = Path(SCHEMA_PATH)
    gov = RuntimeGovernor(schema_path=schema_p if schema_p.exists() else None)

    ctx_data = request.context
    ctx = GovernorContext(
        device_tier=ctx_data.get("device_tier", "MID"),
        low_power_mode=ctx_data.get("low_power_mode", False),
        low_sensory_mode=ctx_data.get("low_sensory_mode", False),
        no_flicker_mode=ctx_data.get("no_flicker_mode", False),
        monochrome_mode=ctx_data.get("monochrome_mode", False),
        granted_capabilities=set(ctx_data.get("granted_capabilities", [])),
        allow_sensor_states=ctx_data.get("allow_sensor_states", False),
        human_override=ctx_data.get("human_override", {})
    )

    decision = gov.process(request.payload, ctx)

    # Audit log (Kafka)
    decision_dict = {
        "accepted": decision.accepted,
        "manifestation_gate_open": decision.manifestation_gate_open,
        "blocked_by_policy": decision.blocked_by_policy,
        "trace_id": decision.trace_id,
        "effective_contract": decision.effective_contract,
        "renderer_snapshot": decision.renderer_snapshot,
        "mutations": decision.mutations,
        "policy_violations": decision.policy_violations,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    background_tasks.add_task(publish_audit_log, decision_dict)

    # Live fanout (NATS) if accepted
    if decision.accepted and decision.manifestation_gate_open:
        room_id = request.context.get("room_id", "default_room")
        background_tasks.add_task(publish_visual_command, room_id, decision.renderer_snapshot)

    return decision_dict

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "nats": "connected" if nc and nc.is_connected else "disconnected",
        "kafka": "initialized" if kp else "disconnected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
