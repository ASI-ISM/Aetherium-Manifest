# RFC-AM-0001 QA Test Matrix

Status: DRAFT  
Source RFC: RFC-AM-0001 v1.0.0  
Depends on: `docs/rfc/RFC-AM-0001_GAP_CHECKLIST.md`  
Target Repo: Aetherium-Manifest  
Purpose: Define verifiable test coverage for RFC Sections 3–14 (MUST/SHOULD), with traceability to code paths, fixtures, and acceptance criteria.

## Legend

- **Priority**: P0 (release-blocking), P1 (high), P2 (recommended)
- **Type**: unit / integration / schema / property / snapshot / e2e
- **Status**:
  - **READY** = test can be written now against existing modules
  - **BLOCKED** = requires missing implementation first
  - **PARTIAL** = some coverage exists but not RFC-complete

---

## A. MUST Compliance Matrix (Sections 3–14)

| Test ID | RFC Ref | Requirement (short) | Priority | Type | Current/Target File(s) | Status | Pass Criteria |
|---|---|---|---|---|---|---|---|
| QA-RFC-3.2-001 | 3.2 | Renderer MUST NOT receive AI output directly | P0 | integration | `am_control_handler.js`, `first_use_surface/response-orchestrator.js`, `runtime_governor.py` | BLOCKED | All render entrypoints require governor-approved contract token/flag |
| QA-RFC-3.2-002 | 3.2 | AI/LLM MUST send structured contract to governor | P0 | integration/schema | `api_gateway/*.py`, `contracts/aeth-control.schema.json` | PARTIAL | Non-schema payload returns reject; schema payload accepted |
| QA-RFC-3.2-003 | 3.2 | Governor MUST run validate→...→telemetry before renderer | P0 | integration | `runtime_governor.py`, `governor/runtime_governor.py` | PARTIAL | Telemetry stage order matches RFC pipeline exactly |
| QA-RFC-4.1-001 | 4.1 | Presence IR MUST be canonical P8 | P0 | schema | `contracts/aeth-presence-ir.schema.json` (proposed) | BLOCKED | Schema enforces `[x,y,z,φ,c,ι,κ,ρ]` ranges/types exactly |
| QA-RFC-4.2-001 | 4.2 | Deterministic render derivation from presence | P0 | property | `runtime_governor.py` | BLOCKED | Same input/context/seed => byte-identical emitted render contract |
| QA-RFC-4.2-002 | 4.2 | Randomness MUST use trace_seed and hash | P0 | unit/property | `runtime_governor.py`, `api_gateway/deterministic_replay.py` | BLOCKED | Changing seed changes deterministic trace; same seed reproduces hash |
| QA-RFC-5.1-001 | 5.1 | Risk MUST decompose safety/accessibility/hardware | P0 | unit | `runtime_governor.py` | BLOCKED | `rho_weighted` equals weighted sum of 3 components (clamped 0..1) |
| QA-RFC-5.2-001 | 5.2 | Weights MUST sum to 1 and each in [0,1] | P0 | unit/schema | config module (proposed) | BLOCKED | Invalid weights reject at load-time |
| QA-RFC-6.1-001 | 6.1 | ε MUST clamp to device caps | P0 | unit | runtime governor / cap module | BLOCKED | `epsilon <= κ_T` across LOW/MID/HIGH/ULTRA |
| QA-RFC-6.1-002 | 6.1 + 10.2 | MUST block high-actuation when `ρ >= ρ_block` | P0 | integration | governor pipeline | PARTIAL | Jobs flagged high-actuation are suppressed above threshold |
| QA-RFC-7.1-001 | 7.1 | `H_bus` MUST be normalized [0,1] | P0 | unit | `src/runtime/entropy_guardrail.ts` (proposed) | BLOCKED | Entropy computation never escapes [0,1] |
| QA-RFC-7.2-001 | 7.2 | MUST enter SAFE_PROFILE when H_bus > H_high 3 frames | P0 | integration | entropy guard + governor | BLOCKED | Exactly 3 consecutive frames trigger SAFE_PROFILE |
| QA-RFC-7.2-002 | 7.2 | MUST recover with low entropy + cooldown complete | P0 | integration | entropy guard + governor | BLOCKED | Recovery denied unless low entropy window + cooldown=0 |
| QA-RFC-7.3-001 | 7.3 | MUST suppress high-actuation at H_critical | P0 | integration | entropy guard + governor | BLOCKED | Immediate suppression when `H_bus >= H_critical` |
| QA-RFC-8.2-001 | 8.2 | MUST use priority lattice bands | P0 | unit | `src/runtime/transition_resolver.ts` (proposed) | BLOCKED | Resolver applies band priorities exactly |
| QA-RFC-8.3-001 | 8.3 | MUST resolve conflicts by fixed tie-break chain | P0 | unit/property | transition resolver | BLOCKED | Chosen transition follows safety>priority>severity>order>lexical |
| QA-RFC-8.3-002 | 8.3 | Resolver MUST be deterministic | P0 | property/snapshot | transition resolver | BLOCKED | Same candidate set yields same transition and resolver rank |
| QA-RFC-9-001 | 9 | MUST NOT imply high certainty when `u_t >= U_critical` | P0 | integration/snapshot | renderer manifest compiler | BLOCKED | Output channels reflect damped certainty profile |
| QA-RFC-11-001 | 11 | MUST enforce H_critical default | P0 | unit/config | defaults registry (proposed) | BLOCKED | Runtime boot fails or warns if overridden below MUST floor |
| QA-RFC-11-002 | 11 | MUST enforce ρ_block default behavior | P0 | unit/integration | defaults registry + governor | BLOCKED | High-actuation blocked at/above configured ρ_block |
| QA-RFC-12-001 | 12 | MUST validate schema before processing | P0 | integration | `runtime_governor.py` | READY | Invalid schema rejected prior to transition/clamp |
| QA-RFC-12-002 | 12 | MUST compute weighted risk in frame algorithm | P0 | unit | governor core | BLOCKED | Telemetry includes correct `rho_weighted` per formula |
| QA-RFC-12-003 | 12 | MUST enforce dwell/non-oscillation guards | P0 | integration | transition guard module | BLOCKED | Flip limit/window policy blocks chatter transitions |
| QA-RFC-12-004 | 12 | MUST emit telemetry every decision | P0 | integration/schema | `governor/main.py`, runtime governor | PARTIAL | Every process() call emits frame telemetry event |
| QA-RFC-13.1-001 | 13.1 | Frame telemetry MUST match RFC schema fields | P0 | schema/integration | `contracts/aeth-telemetry-frame.schema.json` (proposed) | BLOCKED | Emitted events validate schema 100% |
| QA-RFC-13.2-001 | 13.2 | Transition telemetry MUST include resolver_rank/hashes | P0 | schema/integration | transition telemetry schema (proposed) | BLOCKED | Accepted/rejected transitions both emit valid event |
| QA-RFC-14-INV001 | INV-001 | Deterministic hash invariant | P0 | property | replay + governor | PARTIAL | N repeated runs => identical trace hash |
| QA-RFC-14-INV002 | INV-002 | `ρ >= ρ_block` implies no high-actuation | P0 | integration | governor risk gate | BLOCKED | 0 false-allow in invariant suite |
| QA-RFC-14-INV003 | INV-003 | `H_bus >= H_critical` immediate suppression | P0 | integration | entropy guardrail | BLOCKED | Suppression occurs same frame |
| QA-RFC-14-INV004 | INV-004 | Exit WARNING/SAFE when recovery conditions satisfied | P1 | integration | governor + entropy | BLOCKED | State exits only when RFC recovery predicate true |
| QA-RFC-14-INV005 | INV-005 | No >N flips in window | P0 | property/integration | transition guard | BLOCKED | Violating traces are rejected/held |
| QA-RFC-14-INV006 | INV-006 | Device caps never exceeded | P0 | unit/property | cap table + governor | PARTIAL | Channel outputs always ≤ tier caps |
| QA-RFC-14-INV007 | INV-007 | Conflict resolver deterministic | P0 | property | transition resolver | BLOCKED | Reordered equivalent inputs give same decision |
| QA-RFC-14-INV008 | INV-008 | Every suppression has suppression_reason | P1 | schema/integration | telemetry emitter | PARTIAL | suppression_reason non-null on suppression events |
| QA-RFC-14-INV010 | INV-010 | Renderer never receives unvalidated contract | P0 | integration/e2e | gateway + governor + renderer bridge | BLOCKED | Unvalidated payload cannot reach renderer channel |
| QA-RFC-14-INV011 | INV-011 | Weight sum invariant holds | P0 | unit | risk config validator | BLOCKED | Invalid weight tuple rejected |
| QA-RFC-14-INV012 | INV-012 | SAFE recovery needs hysteresis and cooldown | P0 | integration | entropy guard + governor | BLOCKED | Recovery blocked if either precondition missing |

---

## B. SHOULD Coverage Matrix

| Test ID | RFC Ref | SHOULD Requirement | Priority | Type | Current/Target File(s) | Status | Pass Criteria |
|---|---|---|---|---|---|---|---|
| QA-RFC-6.3-001 | 6.3 | High uncertainty SHOULD reduce assertiveness | P1 | unit/snapshot | governor + visual compiler | PARTIAL | Increasing `u_t` monotonically decreases energy/density |
| QA-RFC-7.1-002 | 7.1 | H_bus SHOULD combine defined contributor metrics | P1 | unit | entropy guardrail | BLOCKED | Entropy input vector includes 5 RFC contributors |
| QA-RFC-7.3-002 | 7.3 | SHOULD enter NIRODHA at critical entropy + warn risk | P1 | integration | governor transitions | PARTIAL | Trigger occurs when both conditions met |
| QA-RFC-9-002 | 9 | High uncertainty SHOULD slow transitions/palette aggression | P1 | snapshot/integration | transition compiler + renderer job | BLOCKED | Transition duration/palette saturation reduced in high uncertainty |
| QA-RFC-14-INV009 | INV-009 | Reduced-motion SHOULD clamp motion or raise accessibility risk | P1 | integration | settings + governor | UNKNOWN | Reduced-motion preference always lowers motion outputs |

---

## C. Section 17 Vector-to-Test Binding

| RFC Vector | Bound Tests | Notes |
|---|---|---|
| TV-001 Nominal THINKING→RESPONDING | QA-RFC-5.1-001, QA-RFC-6.1-001, QA-RFC-12-002 | Validates weighted risk + epsilon/gamma outputs |
| TV-002 Entropy high 3 frames | QA-RFC-7.2-001, QA-RFC-7.2-002, QA-RFC-14-INV012 | Validates hysteresis entry/recovery and cooldown |
| TV-003 Policy risk block | QA-RFC-6.1-002, QA-RFC-10.2-001*, QA-RFC-14-INV002 | Validates high-actuation suppression around risk threshold |
| TV-004 Low uncertainty, low intensity | QA-RFC-6.3-001, QA-RFC-9-001, QA-RFC-9-002 | Validates uncertainty-aware rendering behavior |
| TV-005 Transition conflict | QA-RFC-8.2-001, QA-RFC-8.3-001, QA-RFC-8.3-002, QA-RFC-14-INV007 | Validates resolver lattice + deterministic tie-break |
| TV-006 Non-oscillation guard | QA-RFC-12-003, QA-RFC-14-INV005 | Validates flip-limit/window chatter suppression |

\* `QA-RFC-10.2-001` is covered by `QA-RFC-6.1-002` and INV-002; retained as explicit semantic mapping in reports.

---

## D. Proposed Test Files (No code changes in this step)

### Runtime tests
- `tests/runtime/rfc_am_0001_entropy.test.ts`
- `tests/runtime/rfc_am_0001_transition_resolver.test.ts`
- `tests/runtime/rfc_am_0001_uncertainty.test.ts`
- `tests/runtime/rfc_am_0001_invariants.test.ts`
- `tests/runtime/rfc_am_0001_vectors.test.ts`

### AETH / contract tests
- `tests/aeth/rfc_am_0001_presence_schema.test.ts`
- `tests/aeth/rfc_am_0001_telemetry_schema.test.ts`
- `tests/aeth/rfc_am_0001_type_system.test.ts`

### Fixtures
- `tests/fixtures/rfc-am-0001/tv-001.json`
- `tests/fixtures/rfc-am-0001/tv-002.json`
- `tests/fixtures/rfc-am-0001/tv-003.json`
- `tests/fixtures/rfc-am-0001/tv-004.json`
- `tests/fixtures/rfc-am-0001/tv-005.json`
- `tests/fixtures/rfc-am-0001/tv-006.json`

---

## E. Exit Criteria for QA Sign-off (RFC v1)

Release candidate is QA-pass only when all are true:

1. All **P0 MUST tests** pass in CI.
2. All Section 17 vectors pass with deterministic snapshots.
3. Invariant suite has zero false-allow for INV-002/003/005/010/011/012.
4. Telemetry schema validation passes for both frame and transition events.
5. Replay determinism checks pass for fixed seed/policy/context inputs.

