# RFC-AM-0001 Gap Checklist

Status: DRAFT  
Source RFC: RFC-AM-0001 v1.0.0  
Target Repo: Aetherium-Manifest  
Purpose: Map every RFC MUST/SHOULD/REFERENCE/EXPERIMENTAL item to current code status.

## Legend

- **DONE** = implemented and tested
- **PARTIAL** = implemented but incomplete
- **MISSING** = not found
- **CONFLICT** = current code contradicts RFC
- **UNKNOWN** = requires manual inspection

## Checklist

| RFC Section | Requirement | Level | Current File(s) | Status | Gap | Required Action | Test Needed |
|---|---|---|---|---|---|---|---|
| 3.2 | Renderer MUST NOT receive AI output directly | MUST | `runtime_governor.py`, `governor/runtime_governor.py`, `am_control_handler.js`, `first_use_surface/response-orchestrator.js` | UNKNOWN | Governor exists, but end-to-end call graph to renderer is not fully mapped | Trace API → governor → renderer path and document enforcement point | Integration path test |
| 3.2 | AI/LLM MUST emit structured contract before governor | MUST | `contracts/aeth-control.schema.json`, `governor/particle-control.schema.json`, `api_gateway/*.py` | PARTIAL | Structured schemas exist; ingestion contract uniformity across entrypoints is unclear | Enforce single ingress contract and reject non-contract payloads | API contract tests |
| 3.2 | Governor MUST validate/clamp/resolve/apply safety/telemetry before renderer | MUST | `runtime_governor.py` (pipeline stages), `governor/runtime_governor.py` | PARTIAL | Stage coverage exists; transition conflict lattice + entropy-driven profile rules are incomplete | Add missing stages/ordering assertions per RFC 12 | Stage-order parity tests |
| 4.1 | Presence IR MUST use canonical `P8=[x,y,z,φ,c,ι,κ,ρ]` | MUST | `contracts/aeth-control.schema.json` (`presence8d`) | CONFLICT | Repo `presence8d` uses alternate 8 dimensions (not RFC-AM-0001 tuple) | Add RFC v1 Presence IR schema + migration/compat appendix | Schema + fixture tests |
| 4.2 | Render params MUST derive deterministically from Presence IR | MUST | `runtime_governor.py`, `governor/runtime_governor.py` | PARTIAL | Deterministic intent present, but formal mapping from P8 to outputs not standardized | Implement explicit deterministic derivation functions | Determinism replay tests |
| 4.2 | Randomness MUST be seeded by `trace_seed` and included in trace hash | MUST | — | MISSING | No explicit `trace_seed` requirement wired in runtime outputs | Add seeded RNG policy + hash inclusion in emitted trace | Replay hash tests |
| 5.1 | Risk MUST decompose into safety/accessibility/hardware | MUST | `runtime_governor.py` (policy/psycho safety caps), `test_runtime_governor_psycho_safety.test.ts` | PARTIAL | Signals exist but no formal `rho_safety/rho_accessibility/rho_hardware` object everywhere | Add structured risk model and persist in telemetry | Unit tests + telemetry schema tests |
| 5.2 | Weights MUST satisfy normalization constraints | MUST | — | MISSING | No enforced `w_s+w_a+w_h==1` gate found | Add config validator for risk weights | Config validation tests |
| 6.1 | Runtime MUST clamp `ε` to device caps | MUST | `runtime_governor.py` (device tier caps), `governor/runtime_governor.py` | PARTIAL | Clamps exist but not via RFC `ε` equation path | Implement epsilon coupling function with cap table | TV-001 / TV-003 |
| 6.1 | Runtime MUST NOT allow high-actuation when `ρ >= ρ_block` | MUST | `runtime_governor.py`, `governor/runtime_governor.py` | PARTIAL | Policy blocks exist; explicit RFC high-actuation classifier not found | Add high-actuation predicate + hard block gate | TV-003 |
| 6.2 | Runtime SHOULD/REFERENCE compute coherence gain `γ` using RFC equation | REFERENCE v0.1 | — | MISSING | Gamma equation is not implemented as explicit named runtime function | Add `compute_gamma(iota, c, H_bus)` and wire to morphology compile | TV-001 / TV-004 |
| 6.3 | High uncertainty SHOULD reduce visual assertiveness | SHOULD | `runtime_governor.py` (psycho safety, fallback), visual profiles | PARTIAL | Dampening exists but not tied to computed `u_t` contract | Add uncertainty-aware renderer modifiers | TV-004 + regression visual tests |
| 7.1 | `H_bus` MUST be normalized in [0,1] | MUST | — | MISSING | No canonical runtime entropy metric module found | Add entropy module with normalization contract | Unit tests |
| 7.1 | `H_bus` SHOULD combine jitter/conflicts/schema repair/frame drops/policy suppression | SHOULD | — | MISSING | Entropy inputs not formally aggregated | Implement bus entropy aggregator with defined contributors | Entropy component tests |
| 7.2 | MUST enter SAFE_PROFILE when `H_bus > H_high` for 3 consecutive frames | MUST | — | MISSING | No 3-frame hysteresis guardrail in runtime path | Add entropy guardrail state machine | TV-002 |
| 7.2 | MUST recover only under low entropy + cooldown complete | MUST | — | MISSING | Recovery hysteresis rules not encoded as RFC state conditions | Add recovery window + cooldown enforcement | TV-002 / invariant tests |
| 7.3 | MUST suppress high-actuation when `H_bus >= H_critical` | MUST | — | MISSING | Critical entropy immediate suppression not found | Add hard entropy suppression gate | Invariant INV-003 |
| 7.3 | SHOULD enter NIRODHA when critical entropy + warning risk | SHOULD | `runtime_governor.py` (NIRODHA state exists) | PARTIAL | NIRODHA exists but trigger conditions not RFC-specific | Add trigger binding to `H_critical` and `ρ_warn` | Safety transition tests |
| 8.2 | Runtime MUST use priority lattice bands | MUST | `runtime_governor.py` (allowed transitions only) | MISSING | Transition allow-list exists; lattice bands (500..0) not implemented | Add numeric priority band model | TV-005 |
| 8.3 | Conflict resolver MUST evaluate deterministic order (safety→priority→severity→source_order→lexical) | MUST | — | MISSING | No dedicated resolver module with ordered tie-break chain found | Implement deterministic transition resolver | TV-005 |
| 8.3 | Resolver MUST be deterministic | MUST | `runtime_governor.py` | PARTIAL | Deterministic intent exists but not formalized with resolver telemetry rank fields | Emit resolver rank metadata and deterministic tie-break proof | Resolver snapshot tests |
| 9 | When `u_t >= U_critical`, renderer MUST NOT imply high certainty | MUST | — | MISSING | No uncertainty policy contract sent to renderer | Add uncertainty-to-visual suppression policy | TV-004 + UX assertions |
| 9 | For high uncertainty, runtime SHOULD reduce energy/density and slow transitions | SHOULD | `visual_state_profiles.ts`, `runtime_governor.py` | PARTIAL | Indirect profile behavior exists; no direct `u_t`-driven formula | Implement explicit uncertainty scaling functions | Unit tests |
| 10.2 | Runtime MUST NOT execute high-actuation when `ρ >= ρ_block` | MUST | `runtime_governor.py`, `governor/runtime_governor.py` | PARTIAL | Guards exist but RFC high-actuation definition fields not centrally checked | Encode high-actuation definition gate | TV-003 |
| 11 | `H_critical` and `ρ_block` defaults marked MUST must be enforced | MUST | — | MISSING | Defaults table not codified in runtime config | Add RFC defaults registry and validation | Config tests |
| 11 | Runtime SHOULD maintain full defaults registry completeness (weights, entropy thresholds, cooldown/recovery, dwell times, `λ_smooth`, uncertainty thresholds, flip limits, tier caps) | SHOULD | — | MISSING | Registry coverage is incomplete versus RFC defaults table | Define complete defaults object with schema/versioning | Config completeness tests |
| 12 | Runtime MUST validate schema before processing | MUST | `runtime_governor.py` (`validate_schema` stage), `governor/runtime_governor.py`, `governor.ts` | PARTIAL | Validation exists in governor paths, but all ingress/render paths are not fully proven | Audit all ingress paths and enforce validation invariant globally | Existing governor tests + ingress integration tests |
| 12 | Runtime MUST compute weighted risk | MUST | — | MISSING | No explicit `rho_weighted` pipeline step found | Add weighted-risk computation stage | TV-001/2/3 |
| 12 | Runtime MUST enforce dwell-time/non-oscillation guards | MUST | — | MISSING | No `flip_limit_N`/`flip_window_ms` guard in runtime path | Add anti-oscillation guard | TV-006 |
| 12 | Runtime MUST emit telemetry for decisions | MUST | `runtime_governor.py` telemetry list/store, `governor/main.py` audit emit | PARTIAL | Telemetry exists but schema does not match RFC Section 13 fields | Introduce RFC frame/transition telemetry schemas | Schema + integration tests |
| 13.1 | Frame telemetry MUST emit required RFC fields | MUST | `runtime_governor.py`, `governor/main.py` | PARTIAL | Missing/renamed fields vs RFC v1 frame schema | Add telemetry adapter/emitter for exact keys | Telemetry schema validation |
| 13.2 | Transition telemetry MUST emit accepted/rejected events with resolver rank and hashes | MUST | `runtime_governor.py` | MISSING | No dedicated transition event schema with resolver rank chain | Add transition telemetry event emitter | Transition telemetry tests |
| 14 INV-001 | Same input/context/seed/policy version produces same trace hash | MUST | `api_gateway/deterministic_replay.py`, `runtime_governor.py` | PARTIAL | Replay tooling exists, but RFC trace-hash invariant not fully bound to seed+policy | Bind trace hash contract + deterministic fixtures | Invariant suite |
| 14 INV-002 | `ρ >= ρ_block` ⇒ no high-actuation | MUST | — | MISSING | Requires explicit risk/high-actuation formalization first | Add invariant tests after risk gate implementation | INV-002 |
| 14 INV-003 | `H_bus >= H_critical` suppresses high-actuation immediately | MUST | — | MISSING | Entropy critical path missing | Add invariant once guardrail added | INV-003 |
| 14 INV-004 | Must exit WARNING/SAFE_PROFILE when recovery conditions satisfied | MUST | — | MISSING | No RFC hysteresis recovery state machine found | Implement recovery transition policy | INV-004 |
| 14 INV-005 | No flip-flop beyond configured limit/window | MUST | — | MISSING | Non-oscillation counter absent | Add flip counter/time-window gate | TV-006 + INV-005 |
| 14 INV-006 | Device caps are never exceeded | MUST | `runtime_governor.py` (tier caps), `test_runtime_governor_psycho_safety.test.ts` | PARTIAL | Caps exist but RFC defaults table (LOW/MID/HIGH/ULTRA) not fully codified | Align cap table with RFC config | Cap boundary tests |
| 14 INV-007 | Transition conflict resolution deterministic | MUST | — | MISSING | Resolver module not present | Implement resolver and deterministic logging | TV-005 + INV-007 |
| 14 INV-008 | Every suppression has `suppression_reason` telemetry | MUST | `runtime_governor.py` (policy mutation notes) | PARTIAL | Reasons exist in notes; not guaranteed in structured telemetry schema | Add mandatory suppression_reason field | Telemetry contract tests |
| 14 INV-009 | Reduced-motion SHOULD increase accessibility risk or clamp motion | SHOULD | `first_use_surface/settings-store.js`, `runtime_governor.py` | UNKNOWN | Preference pipeline to risk/accessibility clamp not fully mapped | Wire reduced-motion into accessibility risk path | Accessibility integration tests |
| 14 INV-010 | Renderer never receives unvalidated AI contract | MUST | `runtime_governor.py`, `governor/main.py` | PARTIAL | Governor validates schema, but alternate non-governor paths may exist | Audit and block non-governor render entrypoints | Integration path tests |
| 14 INV-011 | `w_s + w_a + w_h == 1.0` | MUST | — | MISSING | Weight normalization gate absent | Add strict validation | Unit tests |
| 14 INV-012 | SAFE_PROFILE recovery needs hysteresis + cooldown completion | MUST | — | MISSING | No explicit SAFE_PROFILE recovery invariant found | Implement and test recovery gates | INV-012 |

## Section 17 Test Vector Mapping

| Test Vector | Primary RFC Feature | Current Coverage | Gap Status | Target Test File(s) |
|---|---|---|---|---|
| TV-001 Nominal THINKING→RESPONDING | Weighted risk + epsilon/gamma equations | No exact vector fixture found | MISSING | `tests/runtime/rfc_am_0001_vectors.test.ts` (proposed) |
| TV-002 Entropy high 3 frames | Entropy hysteresis + SAFE_PROFILE + cooldown | No entropy guard module/tests found | MISSING | `tests/runtime/rfc_am_0001_entropy.test.ts` (proposed) |
| TV-003 Policy risk block | High-actuation suppression near block threshold | Partial psycho-safety caps exist | PARTIAL | Extend `test_runtime_governor_psycho_safety.test.ts` + new RFC vector tests |
| TV-004 Low uncertainty low intensity | Uncertainty-aware damping behavior | No explicit `u_t` computation tests | MISSING | `tests/runtime/rfc_am_0001_uncertainty.test.ts` (proposed) |
| TV-005 Transition conflict resolution | Deterministic priority lattice resolver | No resolver test with tie-break chain | MISSING | `tests/runtime/rfc_am_0001_transition_resolver.test.ts` (proposed) |
| TV-006 Non-oscillation guard | flip_limit/window suppression | No flip-flop guard tests | MISSING | `tests/runtime/rfc_am_0001_oscillation.test.ts` (proposed) |

## Section 18 Module Mapping (RFC → Repo)

| RFC Module Order | RFC Path | Current/Proposed Repo Path | Mapping Notes |
|---|---|---|---|
| 1 | `contracts/aeth-presence-ir.schema.json` | **Proposed:** `contracts/aeth-presence-ir.schema.json` | Not present yet; keep existing `contracts/aeth-control.schema.json` for backward compatibility |
| 2 | `contracts/aeth-telemetry-frame.schema.json` | **Proposed:** `contracts/aeth-telemetry-frame.schema.json` | Not present |
| 3 | `src/aeth/parser.ts` | **Proposed:** `tools/aeth_compiler/parser.ts` or `src/aeth/parser.ts` | `tools/aeth_compiler/README.md` indicates scaffold only |
| 4 | `src/aeth/typecheck.ts` | **Proposed:** `tools/aeth_compiler/typecheck.ts` or `src/aeth/typecheck.ts` | Missing implementation |
| 5 | `src/aeth/compiler.ts` | **Proposed:** `tools/aeth_compiler/compiler.ts` or `src/aeth/compiler.ts` | Missing implementation |
| 6 | `src/runtime/governor.ts` | Existing: `governor.ts`; Python: `runtime_governor.py`, `governor/runtime_governor.py` | Dual TS/Python governance paths exist |
| 7 | `src/runtime/qterro.ts` | **Proposed:** `src/runtime/qterro.ts` | Not found |
| 8 | `src/runtime/transition_resolver.ts` | **Proposed:** `src/runtime/transition_resolver.ts` | Not found |
| 9 | `src/runtime/entropy_guardrail.ts` | **Proposed:** `src/runtime/entropy_guardrail.ts` | Not found |
| 10 | `tests/aeth/*.test.ts` | Existing: `tests/lcl_pipeline.test.js`, fixtures under `tests/fixtures/aeth/` | RFC-specific TS tests missing |
| 11 | `tests/runtime/*.test.ts` | Existing: `test_runtime_governor_psycho_safety.test.ts` + Python tests | Needs RFC vector/invariant suites |
| 12 | `tests/fixtures/rfc-am-0001/*.json` | **Proposed:** `tests/fixtures/rfc-am-0001/` | Not found |

## Recommended Build Order

1. **Define RFC v1 canonical schemas**: add Presence IR and telemetry frame/transition schemas (`contracts/`).
2. **Add RFC defaults registry**: centralize thresholds/weights/caps and validate MUST constraints (`ρ_block`, `H_critical`, weight sum).
3. **Implement risk decomposition core**: compute and persist `rho_safety`, `rho_accessibility`, `rho_hardware`, `rho_weighted`.
4. **Implement entropy guardrail module**: normalized `H_bus`, 3-frame hysteresis, recovery window, cooldown.
5. **Implement deterministic transition resolver**: priority lattice + tie-break chain + resolver rank telemetry.
6. **Implement non-oscillation guard**: `flip_limit_N`, `flip_window_ms`, dwell enforcement.
7. **Implement uncertainty model + rendering dampening**: compute `u_t` and apply uncertainty-aware output suppression.
8. **Align high-actuation gating**: codify RFC high-actuation definition and enforce block behavior.
9. **Emit RFC-compliant telemetry events**: frame + transition schema-complete payloads with suppression/fallback reasons.
10. **Add RFC test suites and fixtures**: Section 17 vectors + Section 14 invariants + integration path tests for AI→Governor→Renderer isolation.
