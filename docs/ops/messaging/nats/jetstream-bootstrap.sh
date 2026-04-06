#!/usr/bin/env bash
set -euo pipefail

# Requires `nats` CLI already authenticated to the target cluster/account.

nats stream add INTENT_EVENTS \
  --subjects "intent.events.>" \
  --storage file \
  --retention limits \
  --max-age 24h \
  --max-msg-size 1MB \
  --replicas 3

nats stream add VISUAL_COMMANDS \
  --subjects "visual.commands.>" \
  --storage file \
  --retention interest \
  --max-age 4h \
  --max-msg-size 512KB \
  --replicas 3

nats stream add ROOM_EVENTS \
  --subjects "room.events.>" \
  --storage file \
  --retention limits \
  --max-age 12h \
  --replicas 3

nats stream add TELEMETRY_STREAM \
  --subjects "telemetry.stream.>" \
  --storage file \
  --retention limits \
  --max-age 72h \
  --max-msg-size 256KB \
  --replicas 3

nats consumer add VISUAL_COMMANDS WS_GATEWAY_FANOUT \
  --filter "visual.commands.>" \
  --ack explicit \
  --deliver new \
  --replay instant \
  --max-deliver 5 \
  --pull=false

nats consumer add ROOM_EVENTS ROOM_SYNC_WORKER \
  --filter "room.events.>" \
  --ack explicit \
  --deliver all \
  --replay instant \
  --max-deliver 10 \
  --pull=true

cat <<'SUBJECTS'
Recommended subject keys:
- intent.events.<region>.<tenant>.<session_id>
- visual.commands.<region>.<room_id>
- room.events.<region>.<room_id>
- telemetry.stream.<region>.<service>
SUBJECTS
