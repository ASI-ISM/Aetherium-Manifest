# Runtime Console (`index.html`)

This document describes the production-safe baseline behavior of the single-file runtime console.

## Purpose

`index.html` is the zero-build operational console for **Aetherium = Light-native Creative OS**.

Users do not command visual "effects" directly. They converse with light to shape outputs such as poster, brand visual, UI concept, diagram, ambient scene, concept art, motion identity, and document visual.

The runtime keeps the same embodiment grammar from the current prototype:

- full-screen light body
- bottom composer
- standby light
- touch burst
- fade
- tilt sensor

### Operational responsibilities

- intent capture (text, file, voice-mock)
- deterministic local particle rendering fallback
- REST integration with the API gateway
- WebSocket state-sync integration with WS gateway
- runtime observability via HUD and compatibility frame

## Connected capabilities

### REST

- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `POST /api/v1/cognitive/generate`
- `POST /api/v1/telemetry/ingest`
- `GET /api/v1/reliability/temporal-morphogenesis`

Headers used:

- `X-API-Key`
- `X-Model-Provider` (emit only)
- `X-Model-Version` (emit only)

### WebSocket

- `WS /ws/state-sync/{room_id}?api_key=...`

The UI sends state deltas after successful emit, and logs WS acknowledgements in the conversation panel.

## Runtime invariants

- UI must stay functional even when API/WS are unavailable.
- Failed network operations degrade gracefully and preserve local visualization.
- Intent vector shown in the panel must match the emitted payload semantics.

## Developer notes

- API base and WS base are user-configurable from UI for local/staging deployments.
- File attachments are sampled into point fields and reused by the renderer target field.
- Voice path is intentionally mock-based in this static runtime to keep deterministic behavior in non-secure contexts.

## Light-native runtime narrative (v3.31)

The console now treats WebGL particles as the primary cognition surface and renders intent-processing as visible state transitions.

### Governing flow

All emits visually and textually follow:

`Intent -> Light Reasoning -> Contract Proposal -> Governor Approval -> Manifestation -> Branching -> Memory`

Terminal feed must show governor gate explicitly before any manifestation branch starts.

### State model

Runtime now uses a dual-layer state language:

- Operational: `IDLE`, `EVALUATING`, `MANIFESTING`, `STREAMING`, `SEARCHING`
- Phenomenological: `LISTENING`, `INTERPRETING`, `CONVERGING`, `PROPOSING`, `REFINING`, `EXPORTING`, `NIRODHA`

### Interaction surface additions

- Bottom glass composer includes **Attach**, **Voice**, and intent input (`สนทนากับแสง...`).
- Right-side **Design Lineage** panel stores node history, supports time-shift to prior nodes, and branch pruning (delete).
- Right-side **Scholar Agent** panel is isolated from manifest branches and is activated only for search-routed intents.

### Intent routing

Single intent is classified into one route and rendered accordingly:

- `image` => coalesced formation
- `video` => streaming flow field
- `search` => scholar panel synthesis path
- `pure_light` => chroma/field modulation

## WS room event contract (state-sync)

State sync now uses `room_event.v1` envelopes (`ws_gateway/room-events.schema.json`) with explicit event families:

- `presence` actions: `join`, `leave`, `active_role`, `cursor_or_focus`
- `action` events with role-scoped `scope` checks (`state.visual`, `state.semantic`, etc.)
- `approval` events for `brand_lead` and `operator`
- `conflict_resolution` audit events for stale `base_stream_id` during concurrent edits

Conflict policy is deterministic and replayable: optimistic concurrency with **last write wins** and explicit conflict event emission before accepting the stale write.
