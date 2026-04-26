# AETH Visual Contract Language (VCL) — Draft Spec v0.1

## 1) Definition

**AETH is a Visual Contract Language (VCL)** for deterministic, governable control of light/particle behaviors. AETH source expresses intent as constrained contracts that can be validated before any runtime actuation.

- Primary objective: deterministic control semantics.
- Safety objective: governor-first deny-by-default enforcement.
- Runtime objective (future): compile contracts to downstream renderer control packets.

## 2) Design Principles

1. **Contract-first:** every emitted control value must be schema-valid.
2. **Deterministic by construction:** no implicit randomness.
3. **Context-aware:** state transitions depend on explicit context keys only.
4. **Safe defaults:** unknown capability => reject or safe-mode fallback.
5. **Replayable:** same input/context must produce same output trace.

## 3) File Structure

An `.aeth` file is UTF-8 text with ordered sections:

1. `meta` — id/version/profile.
2. `context` — declared context keys + bounded values.
3. `presence8d` — normalized world-model dimensions.
4. `rules` — context-aware policy/guard rules.
5. `transitions` — deterministic transition DSL.
6. `outputs` — contract payload projections.

## 4) Core Grammar (informal EBNF)

```ebnf
program        = meta_block, context_block, presence_block, rules_block, transitions_block, outputs_block ;
meta_block     = "meta", "{", meta_entry*, "}" ;
context_block  = "context", "{", context_entry*, "}" ;
presence_block = "presence8d", "{", dimension_entry{8}, "}" ;
rules_block    = "rules", "{", rule_entry*, "}" ;
transitions_block = "transitions", "{", transition_entry+, "}" ;
outputs_block  = "outputs", "{", output_entry+, "}" ;

rule_entry     = "rule", ident, ":", condition, "=>", action, ";" ;
condition      = predicate, { ("and"|"or"), predicate } ;
predicate      = key, comparator, value ;

transition_entry = "state", ident, "{", step+, "}" ;
step           = "when", condition, "->", target, ["else", target], ";" ;
target         = ident | "safe_mode" | "halt" ;
```

## 5) Type System

- Scalars: `int`, `float`, `bool`, `string`.
- Compound: `vec3`, `range[min,max]`, `enum[...]`.
- Deterministic temporal types:
  - `tick_ms` (integer, fixed).
  - `duration_ticks` (integer, non-negative).

No runtime-generated random types are permitted in Phase A.

## 6) 8D Presence IR Binding

The `presence8d` block must define exactly 8 normalized dimensions (`0.0` to `1.0`):

1. `spatial_coherence`
2. `temporal_stability`
3. `intent_confidence`
4. `energy_budget`
5. `interaction_readiness`
6. `novelty_pressure`
7. `safety_margin`
8. `counterfactual_depth`

Compiler target: canonical IR object with numeric precision fixed to 4 decimal places.

## 7) Context-Aware Rule Syntax

Rules are evaluated top-down, deterministic order, first-match or priority-resolved mode (must be declared in `meta.rule_mode`).

### Rule Example

```aeth
rule risk_downgrade: context.risk_score > 0.70 and presence8d.safety_margin < 0.40 => set profile = "safe_mode";
rule low_confidence_halt: context.model_confidence < 0.35 => set transition = "halt";
```

### Rule Constraints

- Rule conditions can only reference declared `context` keys and `presence8d` dimensions.
- Side effects allowed in Phase A:
  - set profile
  - set transition target
  - set output cap values
- Arbitrary mutation is forbidden.

## 8) Transition DSL

Transitions define deterministic state progression.

### Transition Example

```aeth
state nominal {
  when context.event == "observe" and context.model_confidence >= 0.60 -> focus;
  when context.event == "alert" -> safe_mode else halt;
}

state focus {
  when context.tick < 120 -> focus;
  when context.tick >= 120 -> settle;
}
```

### Transition Rules

- Must be acyclic or explicitly bounded by tick/duration guard.
- Each state must have at least one terminal path (`safe_mode`, `halt`, or terminal state).
- Branch predicates must be mutually resolvable by deterministic ordering.

## 9) Governor Validation Assumptions

AETH compilation assumes governor pipeline:

`validate -> transition -> profile_map -> clamp -> fallback -> policy_block -> capability_gate -> telemetry_log`

Validation assumptions:

1. Input source is untrusted.
2. Schema and semantic checks run before capability invocation.
3. Missing bounds invoke clamp or reject (policy-defined).
4. Unsupported capabilities fail closed.
5. Safe mode is always available as fallback profile.

## 10) Determinism Constraints (Phase A)

- No wall-clock dependence inside contract logic.
- No hidden randomness.
- All ordering explicit.
- Floats canonicalized (4 decimal digits) before hashing.
- Replay hash computed from normalized IR + transition trace.

## 11) Out of Scope

- Renderer/shader implementation.
- Non-deterministic generative motion.
- Multi-agent synchronization protocols.
