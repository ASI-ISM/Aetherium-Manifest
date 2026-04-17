# Aetherium Manifest

Aetherium Manifest is a **light-native cognition runtime**: intent is interpreted into deterministic light/particle manifestation with a governor-first safety boundary.

## What changed in this iteration
- Home is now a **pure light-native scene** (canvas + Settings entry only).
- Structural UI (composer, runtime controls, voice, connection, export) is moved into **Settings**.
- Input event handling was modernized to correctly support **IME composition** (Thai/Japanese/etc.) using composition lifecycle + `beforeinput/input` paths, and now blocks accidental Enter-submit from browser IME process-key events (e.g. `keyCode=229`).

---

## Architecture

### Runtime planes
1. **First-use surface (static frontend)**
   - `index.html`
   - `clean-first-surface.css`
   - `clean-first-surface.js`
   - `first_use_surface/*`

2. **Gateway plane (FastAPI / WS / distributed adapters)**
   - `api_gateway/` and top-level gateway helpers
   - request/validation endpoints for emit/validate

3. **Governor plane (canonical control boundary)**
   - `governor/`
   - deny-by-default runtime mutation authority

4. **Contracts + tooling plane**
   - JSON Schemas (root + `docs/schemas/`)
   - contract checker/fuzzer + drift guard (`tools/contracts/`)
   - semantic/latency benchmarks (`tools/benchmarks/`)

### Canonical control boundary
System behavior should preserve this sequence:

`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`

This path is the source of truth for safe runtime mutation.

---

## Contracts

Core contracts/schemas in this repo include:
- `particle-control.schema.json`
- `lcl_schema.json`
- `governor/particle-control.schema.json`
- `governor/scholar_contract_v1.json`
- `docs/schemas/*.json` (versioned copies/documentation views)

### Contract policy
- Treat schema changes as **ABI changes**.
- Maintain compatibility/versioning discipline.
- Keep runtime governor behavior synchronized with contract evolution.

---

## Runtime flow

### Intent-to-light flow (first-use surface)
1. User opens Settings and submits text from the Interaction composer.
2. Language layer resolves language deterministically:
   - explicit setting → browser locale → char heuristics → optional local detector → session memory
3. Response orchestrator maps intent class (greeting/question/etc.) to deterministic text+mood.
4. Manifestation engine renders mood/text into the light scene.
5. Session audit trail appends event metadata (optional export from Settings).

### Gateway/governor integration flow (full stack)
1. Emit payload is validated against contract.
2. Governor applies transition/profile mapping and constraints.
3. Capability + policy gates enforce deny-by-default behavior.
4. Runtime output and telemetry are published to consumers.

### Runtime control stages
`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`

- `validate`: schema + semantic checks
- `transition`: state machine handoff
- `profile_map`: safe perceptual mapping profile
- `clamp`: hard caps for energy/particle/control limits
- `fallback`: deterministic safe degradation path
- `policy_block`: deny-by-default policy enforcement
- `capability_gate`: runtime/environment capability checks
- `telemetry_log`: deterministic observability trail

---

## Grammar (LCL summary)

The Light Control Language (LCL) shape is defined in `light-control-language.ts` and `lcl_schema.json`.

### High-level grammar-like view
```txt
LCL := {
  version,
  intent,
  morphology,
  motion,
  optics,
  content,
  constraints,
  source_text,
  retrieved_formation?,
  particle_control
}

intent := create_light_form | create_glyph | create_scene
optics.color_mode := monochrome | palette | source_radiance
```

### Key semantic groups
- **morphology**: form family/symmetry/density/scale/edge softness
- **motion**: archetype/flow/coherence/turbulence/rhythm/attack/settle
- **optics**: palette/luminance/glow/trail/color mode
- **constraints**: max targets/photons/energy hard limits
- **particle_control**: low-level runtime-safe control envelope


### Formal grammar references
- AETH grammar (EBNF): `docs/aeth/spec/grammar.ebnf`
- AETH semantics/versioning: `docs/aeth/spec/semantics.md`, `docs/aeth/spec/versioning.md`
- LCL JSON schema: `lcl_schema.json`

---

## Local development & checks

### Recommended minimum before PR
```bash
npm run lint
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
```

### Extended verification set
```bash
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
python3 tools/contracts/contract_fuzz.py
python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json
npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
```

---

## Notes
- Frontend remains static-host friendly; no mandatory bundle step in-repo.
- Prototype telemetry persistence is intentionally non-durable by default.
- Production hardening should include persistent telemetry storage, key rotation, and compatibility gates.
