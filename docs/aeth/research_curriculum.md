# AETH Phase A Research Curriculum

## Purpose

Phase A establishes a deterministic research scaffold for **AETH (Aetherium Visual Contract Language)** focused on AI world-model curriculum and light-particle control contracts. This phase is documentation and fixtures only; renderer implementation is explicitly out of scope.

## Scope Boundaries (Phase A)

- In scope: language spec draft, 8D world-model IR framing, contract schema, deterministic fixtures, and evaluation protocol.
- Out of scope: shader runtime, visual renderer execution, adaptive optimization loops, non-deterministic sampling.

## Learning Objectives

By the end of Phase A, a model/pipeline should be able to:

1. Parse AETH documents into deterministic intermediate structures.
2. Map scene instructions into an **8D Presence IR** for governance.
3. Apply context-aware rules and transition DSL blocks without ambiguity.
4. Validate output against governor assumptions and deny-by-default safety policy.
5. Produce repeatable, testable control artifacts for downstream runtimes.

## Curriculum Modules

### Module 1 — Spatial Reasoning

**Goal:** encode and reason about position, orientation, and region semantics in 3D scene space.

- Topics:
  - Absolute and relative anchors (`origin`, `anchor`, `region`).
  - Deterministic transform ordering (`translate -> rotate -> scale`).
  - Bounded movement corridors.
- Exercises:
  - Convert natural-language scene intent into explicit anchor/offset tuples.
  - Verify no frame exceeds velocity/position clamp.
- Deterministic checks:
  - Position vectors must be finite numeric triples.
  - Region IDs must resolve from known symbol table.

### Module 2 — Visual Reasoning

**Goal:** express light/particle appearance constraints as contracts, not free-form styling.

- Topics:
  - Palette references, emissive intensity bounds, alpha envelopes.
  - Layering priorities and occlusion-safe ordering.
  - Snapshot invariants for visual signatures.
- Exercises:
  - Encode a pulse pattern with fixed period and bounded intensity.
  - Compare expected and actual visual contract deltas.
- Deterministic checks:
  - Color tokens must resolve to canonical palette values.
  - Oscillation parameters require explicit period/phase.

### Module 3 — Physics Reasoning

**Goal:** define controllable motion under constrained pseudo-physics suitable for governance.

- Topics:
  - Kinematic state representation (velocity, acceleration, damping).
  - Force field abstractions with hard caps.
  - Collision response classes (`absorb`, `deflect`, `halt`).
- Exercises:
  - Author a stable vortex profile with deterministic timestep.
  - Demonstrate bounded energy over finite horizon.
- Deterministic checks:
  - Timestep (`dt_ms`) must be declared and constant per transition block.
  - Integration mode restricted to approved enum set.

### Module 4 — Counterfactual Reasoning

**Goal:** represent alternative transitions and safety fallbacks without branching ambiguity.

- Topics:
  - Guarded transitions (`when`, `unless`, `fallback`).
  - Counterfactual branch IDs and replay determinism.
  - Evidence tagging for why a branch was selected.
- Exercises:
  - Model `safe_mode` activation on confidence drop.
  - Replay branch decisions from telemetry log.
- Deterministic checks:
  - Branch predicates may only reference declared context keys.
  - Fallback path required for high-risk classes.

### Module 5 — Safety Reasoning

**Goal:** enforce governor-first safety policy for any visual control signal.

- Topics:
  - Deny-by-default capability gates.
  - Context risk scoring and policy block semantics.
  - Safe-mode profile remapping.
- Exercises:
  - Build a rule set that blocks unsafe emission amplitude.
  - Validate warning and downgrade telemetry events.
- Deterministic checks:
  - Every executable transition has an associated risk class.
  - Unsupported capabilities fail closed with explicit reason.

## Evaluation Framework

### A. Parsing and Contract Fidelity

- **Pass criteria:** all fixtures parse to canonical AST/IR with no nondeterministic fields.
- **Metrics:** parse success rate, unresolved token count, schema conformance rate.

### B. World-Model Alignment (8D)

- **Pass criteria:** each generated control state maps all required 8D dimensions.
- **Metrics:** dimensional completeness %, normalization violations, clamp interventions.

### C. Transition Determinism

- **Pass criteria:** identical input/context yields identical transition sequence.
- **Metrics:** replay hash match rate, branch consistency score.

### D. Safety/Governor Compliance

- **Pass criteria:** unsafe or underspecified control requests are downgraded or blocked.
- **Metrics:** policy violation catch rate, false-allow count (target: 0).

### E. Curriculum Progression

- **Pass criteria:** module competency thresholds met before advancing.
- **Metrics:** per-module rubric score (0-4), cumulative readiness index.

## Rubric (0-4)

- **0:** Missing/invalid representation.
- **1:** Partial representation with major ambiguity.
- **2:** Structurally valid but unstable under replay.
- **3:** Deterministic and policy-compliant for standard cases.
- **4:** Deterministic, policy-compliant, and robust across edge cases.

## Phase A Deliverables

- AETH language specification draft.
- 8D Presence IR documentation.
- AETH control contract schema.
- Deterministic `.aeth` fixture examples for normal + warning/safe-mode paths.
- Compiler README documenting intended compile pipeline (spec only, no runtime renderer).

## Non-Implementation Note

Phase A intentionally avoids renderer implementation. Any mention of rendering is strictly contract/output intent for future phases.
