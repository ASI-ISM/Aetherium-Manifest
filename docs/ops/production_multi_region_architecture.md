# Production Multi-Region Architecture (AWS + Cloudflare Edge + CDN)

## Status and scope

- **Status:** proposed production target architecture.
- **Repository reality (April 2026):** current gateway/runtime is still single-process with in-memory room state and telemetry storage; multi-region infra in this doc is a rollout plan, not yet implemented.
- **Non-negotiable guardrail:** runtime state mutation remains Governor-first (`validate -> transition -> profile_map -> clamp -> fallback -> policy_block -> capability_gate -> telemetry_log`).

## 1) Global architecture target

```text
Client
  -> Cloudflare Edge (Workers + CDN + WAF)
  -> Region selection (latency + health)
  -> Regional API Gateway (FastAPI)
  -> Runtime Governor
  -> Event Bus (Kafka or NATS JetStream)
  -> State control plane (Redis Cluster)
  -> Telemetry TSDB (regional ingest + global analytics)
```

Recommended initial regions:
- `ap-southeast-1`
- `us-east-1`
- `eu-west-1`

## 2) Edge layer design

### 2.1 Cloudflare Workers
- latency-based regional routing with regulatory affinity
- request pre-validation and envelope sanity checks
- trace header injection (`trace_id`, `region_hint`, `edge_pop`)

### 2.2 CDN
- cache immutable assets (`index` companion assets should be versioned)
- cache shader/static bundles aggressively
- support controlled cache purge by release id

### 2.3 WebSocket edge handling
- terminate TLS at edge/L7
- optional Durable Objects for room-level coordination metadata
- regional fallback on health degradation

## 3) Regional runtime pattern

### 3.1 Active-active regions
Each region should be able to:
- accept API and WS traffic
- run Governor path locally
- emit event streams and telemetry

### 3.2 Latency targets (initial)
- Edge -> Region p95 < 50 ms
- Region WS fanout p95 < 30 ms (intra-region)

## 4) API and Governor

### 4.1 API Gateway
- keep gateway stateless
- autoscale independently from room/state workers

### 4.2 Governor placement
All control signals must pass through Governor per region before state mutation or renderer-visible events.

## 5) Event system

### Option A: Kafka (MSK)
- durable event log
- high throughput
- mature cross-region replication

### Option B: NATS JetStream
- lower operational complexity
- low-latency fanout
- good fit for room/event streaming

Core topic families:
- `intent.events`
- `state.events`
- `visual.commands`
- `telemetry.stream`

Cross-region replication:
- Kafka Cluster Linking/MirrorMaker 2, or
- NATS supercluster/leaf topology

## 6) State consistency model

### 6.1 Redis usage
Redis is a **control plane** for:
- session/presence
- room metadata + version counters
- nonce/replay protections
- governor cache hints

### 6.2 Hybrid consistency strategy
| Data type | Strategy |
|---|---|
| Session | regional-local |
| Room collaboration | primary region ownership with global metadata sync |
| Identity/security claims | globally distributed (e.g. Global Tables) |
| Telemetry | async global aggregation |

### 6.3 Room keys (example)
- `room:{id}:version`
- `room:{id}:state`
- `room:{id}:users`

State updates should be atomic (`INCR version` + apply delta) via transaction/script.

## 7) Telemetry and governance observability

### 7.1 Topology
- regional ingestion for low latency
- global analytics sink for SRE/governance views

### 7.2 Storage options
- ClickHouse (recommended for high-volume event analytics)
- TimescaleDB (if SQL-first operational model is preferred)

### 7.3 Must-have signals
- state transition counts and policy blocks
- p50/p95/p99 latency by stage
- intent confidence distribution
- drift/mismatch indicators (schema vs runtime behavior)

## 8) Frontend delivery + WS recovery

- CDN serves static runtime assets and shaders with versioned filenames
- client connects to nearest healthy WS region
- on disconnect: reconnect -> replay/resync (`last_known_version` contract)

## 9) AI deployment options

### Option A: regional inference
- best latency
- higher infra cost and model operations overhead

### Option B: centralized inference
- lower operating complexity
- cross-region latency penalty

### Recommended hybrid
- route simple intent transforms to regional path
- route heavy reasoning/planning to multi-region inference clusters

## 10) Security baseline

- edge WAF + bot mitigation + rate limits
- API authN/authZ with JWT + signature checks
- nonce and replay protection in Redis
- strict outbound allowlist + private-range deny for SSRF risk control

## 11) Failover

- edge health checks trigger region reroute
- state recovery via snapshot + event replay
- websocket reconnection requires state resync before normal stream resume

## 12) Deployment and rollout

- EKS + Helm per region
- GitHub Actions with canary and blue/green strategy
- phased rollout: single-region sharding -> multi-region affinity -> failover drills

## 13) Cost control

- maximize static cache hit-rate
- cache low-risk intent transforms
- compress and tier telemetry retention

## 14) Alignment with Aetherium principles

- **Interface = Process:** event-driven streaming runtime
- **State before effect:** Governor + contract-gated state transitions
- **Digital organism model:** edge as sensory, regions as cognition clusters, bus as nervous system, manifest as perceptual body

## 15) Critical must-not-miss checklist

1. Governor exists in every region.
2. Contract strictness and drift guard are enforced.
3. Redis remains control-plane focused.
4. Event bus supports versioned cross-region replication.
5. Edge routing and caching are explicitly tested in failure scenarios.

## 16) Suggested next implementation artifacts

- EKS deployment diagram (pods/services/ingress/HPA per region)
- Terraform modules (Cloudflare + AWS baseline)
- 1M concurrent WS load profile and chaos test matrix

## 17) Repository reference package

The repo now includes a production blueprint package under:
- `docs/ops/k8s/` (namespaces, deployments/services, ingress split, HPA, PDB)
- `docs/ops/messaging/nats/` (server config + JetStream bootstrap)
- `docs/ops/messaging/kafka/` (broker baseline + topic bootstrap)

These files are implementation-oriented references and remain non-claims for current runtime status.
