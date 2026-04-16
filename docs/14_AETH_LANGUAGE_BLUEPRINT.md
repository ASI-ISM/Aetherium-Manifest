# 14) AETH Language Blueprint (Implementation-Oriented)

## Status classification
- **Current repo reality:** AETH compiler/runtime is not implemented yet.
- **This document:** implementation blueprint that stays aligned with Governor-first and contract-first constraints.

## Goal
Define AETH as an intent-first DSL that compiles into:
1) Governor-consumable JSON contract payload
2) optional renderer shader artifacts (WGSL/WebGPU)

## Canonical architecture constraints
1. Governor is still the only state mutation authority.
2. Schema remains ABI (versioned + compatibility-reviewed).
3. State-first semantics before perceptual effects.
4. Model/control outputs are untrusted and must be policy-clamped.

## Minimal v0 language scope
```aeth
state THINKING {
  intent: "recursive analysis";
  confidence: 0.82;

  visual {
    shape: vortex;
    particle_density: 0.72;
    turbulence: 0.30;
    flow_direction: inward;
    glow_intensity: 0.85;
    palette: deep_reasoning;
  }

  rule {
    enforce Patimokkha.NO_CHAOTIC_VISUAL;
    if turbulence > 0.9 then clamp;
  }
}
```

## Compiler pipeline (proposed)
```text
.aeth -> parser -> AST -> semantic checks -> IR
                                      -> JSON contract (Governor input)
                                      -> optional WGSL snippets (renderer)
```

## Validation model
- Parse-time: grammar + structure
- Semantic-time: range checks, enum checks, policy references
- Governance-time: runtime Governor validates and clamps final contract

## Versioning policy
- AETH syntax and standard library use semantic versioning.
- Any output contract shape change is ABI-affecting and requires schema versioning + migration note.

## Proposed repository layout (single-repo bootstrap)
```text
docs/aeth/spec/
  grammar.ebnf
  semantics.md
  standard-library.md
  versioning.md

tools/aeth_compiler/
  parser/
  sema/
  codegen/
  cli.py

examples/aeth/
  thinking.aeth
  listening.aeth
  responding.aeth
```

## Phase plan
1. **Phase A:** spec docs + canonical fixtures (`.aeth` + expected JSON output)
2. **Phase B:** parser + semantic validator + golden tests
3. **Phase C:** JSON codegen wired into Governor contract checker path
4. **Phase D:** optional WGSL generation + renderer capability fallback

## Non-claims
- This document does not claim that AETH is currently running in production.
- Multi-device shader portability and runtime capability negotiation remain future implementation steps.
