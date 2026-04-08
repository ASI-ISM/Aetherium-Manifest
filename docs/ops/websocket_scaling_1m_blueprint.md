# WebSocket Scaling Blueprint (1M CCU) for Aetherium Manifest

## Status
- **Design maturity:** production-oriented blueprint for implementation phases.
- **Current repo reality:** gateway runtime is currently single-process/in-memory and not yet this distributed topology.
- **Architecture guardrail:** Governor remains the only mutation boundary before renderer-visible state.

## Target SLO
| Metric | Target |
|---|---|
| Concurrent connections | 1,000,000 |
| Message latency (p95) | < 100 ms |
| Fanout delay (p95) | < 200 ms |
| Reconnect time (p95) | < 2 s |

## Reference Topology (event-driven + perceptual streaming + state sync)

```text
Client
  -> Edge TLS / L7 (Cloudflare or equivalent)
  -> Global LB
  -> WS Gateway Pool (stateless auth + connection lifecycle)
  -> Connection Router / Room Shard
  -> Event Bus (NATS JetStream recommended)
  -> State Control Plane (Redis Cluster)
```

### Alignment with Aetherium runtime model
1. **State-first, effect-second:** inbound controls are validated through Governor pipeline before any room-state mutation.
2. **Event-driven transport:** AI/telemetry/state deltas flow through bus topics and shard-local fanout.
3. **Perceptual streaming:** outbound traffic prioritizes state deltas over visual-only effect messages.
4. **Deterministic observability:** telemetry must include queue drops, shard skew, drift, and replay gaps.

## Capacity model

### Per-node assumptions
- Runtime: Go or Rust event-loop/goroutine design.
- Connection density: ~50,000 connections/node.
- Memory per connection: 2–5 KB (target planning average 3 KB).

### Node count math
- Baseline nodes: `1,000,000 / 50,000 = 20`.
- With redundancy factor 1.5: `30` nodes minimum.
- Practical production envelope: `30–40` nodes for maintenance + failover headroom.

### Memory model
- Total memory for connection metadata at 3 KB average:
  - `1,000,000 * 3 KB ~= 2.86 GiB`.
- Per node at 50k connections:
  - `~146 MiB` (connection metadata only; does not include process/network buffers).

## Sharding strategy

### Room hashing
- `shard = hash(room_id) % N`.
- Keep all participants in a room on the same shard to avoid cross-node broadcast storms.

### Sticky routing
- Reconnect must return clients to prior shard whenever possible.
- Room ownership changes only during controlled rebalance windows.

## Fanout strategy

### Local-first fanout
- Event bus topic ingress lands on owning shard node.
- Broadcast only to local room subscribers.
- Avoid global fanout across all gateway nodes.

### Topic model
- `room.{room_id}` for room-state deltas.
- `user.{user_id}` for private/session signals.
- `broadcast.global` only for rare control-plane messages.

### Payload policy
- Prefer delta payloads to full snapshots.
- Use binary encoding (MessagePack/protobuf) and websocket compression where safe.

## State sync and consistency
- Redis Cluster stores:
  - session presence
  - room metadata
  - room version counters
- Consistency model:
  - shard-local strong ordering
  - cross-region eventual consistency
- Reconnect path:
  - client sends `last_known_version`
  - server replays missing deltas or returns compact snapshot + resume point

## Backpressure model (critical)

Per connection:
1. bounded outbound queue
2. drop policy by priority (`perceptual_effect` -> `telemetry` -> `state`)
3. disconnect or degrade clients that continuously exceed queue threshold

This preserves state coherence and avoids slow-client amplification failures.

## Multi-region model
- User affinity: nearest region by latency.
- Room pinning: single primary region per room.
- Cross-region replication: async and versioned.
- Failover mode: controlled promotion to prevent split-brain room ownership.

## Failure handling
- Node failure: clients reconnect, shard map remaps, replay from durable bus/state.
- Circuit breaker: stop new session admission before saturation.
- Drain mode: graceful connection migration during deploy/rebalance.

## Required observability signals
- connections per node / per shard
- msg/sec ingress+egress
- p95 end-to-end latency
- fanout delay and replay lag
- dropped messages by reason and priority
- drift correlation between AI intent and renderer state

## Rollout phases
1. **Phase 0:** add shard router + backpressure primitives and metrics contracts.
2. **Phase 1:** single-region sharded gateways with Redis control plane.
3. **Phase 2:** event bus fanout offload + replay semantics.
4. **Phase 3:** multi-region affinity + disaster failover tests.
5. **Phase 4:** load validation to 1M CCU equivalent with chaos drills.

## In-repo implementation helpers
- `api_gateway/ws_scaling.py` provides planner + shard/backpressure/reconnect primitives.
- `api_gateway/test_ws_scaling.py` validates math and queue semantics.
- `aetherbus_tachyon_go/` includes a production-skeleton WebSocket node and Phase-2 primitives (JetStream bridge, deterministic shard+sticky contract, reconnect replay semantics).

## Non-goals in this blueprint
- This document does **not** claim that current repository runtime already supports 1M CCU.
- Kernel/eBPF, QUIC/WebTransport, and edge compute are future optimization tracks.
