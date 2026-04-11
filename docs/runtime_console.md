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
