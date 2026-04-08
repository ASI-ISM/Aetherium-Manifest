# Aetherium Kubernetes + Autoscale + Messaging Blueprint

## Status
- **Current repo reality:** prototype runtime still keeps room sync (`STATE_SYNC_ROOMS`) and telemetry (`TELEMETRY_TS_DB`) in-process/in-memory.
- **This folder:** production-target deployment blueprint, aligned to Governor-first architecture and contract-first ABI model.
- **Guardrail:** Governor remains single mutation authority for renderer-visible envelopes.

## Verified alignment with current repository
1. `api_gateway/main.py` already handles REST, API-key/policy gates, proxy signing, telemetry ingest/query, and websocket room endpoints in one service.
2. Runtime governor path is canonical and must remain authoritative (`validate -> transition -> profile_map -> clamp -> fallback -> policy_block -> capability_gate -> telemetry_log`).
3. `particle-control.schema.json` is treated as ABI/contract payload boundary between cognition and manifestation.
4. Current state sync + telemetry durability are not externalized yet; therefore Redis + durable telemetry/event backplanes are production requirements, not present-day claims.

## Topology target
```text
Cloudflare Edge/CDN/WAF
  -> AWS ALB/NLB
  -> ingress-nginx split (public-http / public-ws / internal-only)
  -> api-gateway + ws-gateway + governor
  -> NATS JetStream (low latency) + Kafka (durable replay/audit)
  -> Redis Cluster (room/session/nonce state plane)
  -> ClickHouse/Timescale telemetry sink
```

## Why dual-bus (NATS + Kafka)
- **NATS JetStream:** fast fanout path for `visual.commands.*` and room live deltas.
- **Kafka:** durable analytics/audit/replay path for contract history and telemetry retention.
- This split preserves low-latency perceptual output while meeting governance + observability replay requirements.

## Included artifacts
- `00-namespaces.yaml`
- `10-api-gateway.yaml`
- `11-ws-gateway.yaml`
- `12-governor.yaml`
- `20-ingress.yaml`
- `30-hpa.yaml`
- `40-pdb.yaml`
- `../messaging/nats/*`
- `../messaging/kafka/*`

## Rollout notes
1. Move in-memory room/session state to Redis transaction/Lua pipeline.
2. Split websocket handling from `api_gateway` into dedicated ws-gateway shards.
3. Publish governor-approved envelopes to NATS/Kafka instead of direct in-process fanout only.
4. Replace in-memory telemetry retention with ClickHouse/TimescaleDB.

## Important non-claim
These manifests/configs are **reference implementation inputs** and do **not** imply that the repository is already running this production topology today.
