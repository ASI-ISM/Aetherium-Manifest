# AetherBus Tachyon Go Node (Phase 2 Skeleton)

Production-oriented WebSocket node skeleton aligned to Aetherium event-driven/state-first architecture.

## Included in this phase
- NATS JetStream publisher/consumer bridge (`jetstream.go`)
- deterministic room shard hashing + sticky session contract
- deterministic reconnect plan + versioned replay buffer (`last_known_version`)
- heartbeat + bounded per-client queue + slow-client backpressure eviction

## WebSocket contract
Endpoint: `/ws`

Optional query params:
- `session_id`: sticky identity for reconnect routing
- `room_id`: room key (defaults to `default`)
- `last_known_version`: room version last seen by client for deterministic replay

Example:

```bash
wscat -c "ws://localhost:8080/ws?session_id=sess-42&room_id=room-alpha&last_known_version=120"
```

## JetStream wiring
Set `NATS_URLS` (comma-separated) to enable bridge mode.

Environment variables:
- `NATS_URLS` (e.g. `nats://127.0.0.1:4222`)
- `AETHER_NODE_ID` (default `node-1`)
- `AETHER_SHARD_COUNT` (default `64`)
- `AETHER_REPLAY_BUFFER` (default `1024`)

Subjects used by this skeleton:
- publish: `room.events.<room_id>`
- consume: `visual.commands.>`

## Important note
This module is additive scaffolding and does not claim that the repository runtime is already a full multi-node production deployment.
