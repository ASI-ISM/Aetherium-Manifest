# AETH World Model — 8D Presence IR

## Purpose

The **8D Presence IR** is the canonical intermediate representation for world-model state used by AETH governor validation and transition decisions.

It is designed to be:

- bounded (`0.0` to `1.0` per dimension),
- interpretable,
- deterministic under replay,
- independent from renderer implementation.

## Dimension Definitions

| Dimension | Key | Meaning | Typical Clamp |
|---|---|---|---|
| D1 | `spatial_coherence` | Structural consistency of scene geometry/anchors. | `[0.10, 0.95]` |
| D2 | `temporal_stability` | Smoothness and continuity across ticks. | `[0.10, 0.98]` |
| D3 | `intent_confidence` | Confidence that control signal matches validated intent. | `[0.00, 1.00]` |
| D4 | `energy_budget` | Fraction of allowed emission/motion energy budget. | `[0.00, 0.85]` |
| D5 | `interaction_readiness` | Readiness for user/event interaction response. | `[0.00, 1.00]` |
| D6 | `novelty_pressure` | Pressure toward exploratory pattern variation. | `[0.00, 0.70]` |
| D7 | `safety_margin` | Distance from policy or physiological risk thresholds. | `[0.20, 1.00]` |
| D8 | `counterfactual_depth` | Depth of evaluated alternative branches. | `[0.00, 0.80]` |

## Canonical IR Shape

```json
{
  "presence8d": {
    "spatial_coherence": 0.8200,
    "temporal_stability": 0.7600,
    "intent_confidence": 0.9100,
    "energy_budget": 0.4300,
    "interaction_readiness": 0.6800,
    "novelty_pressure": 0.2200,
    "safety_margin": 0.8700,
    "counterfactual_depth": 0.3400
  },
  "normalization": {
    "precision_dp": 4,
    "range": [0.0, 1.0]
  }
}
```

## Derivation Guidance (Phase A)

Each dimension should be computed from deterministic upstream features:

- fixed feature list,
- fixed transform ordering,
- explicit coefficient table,
- explicit clamp range.

No stochastic estimators are allowed in Phase A.

## Rule Interaction Model

Rules can read 8D fields directly:

- If `safety_margin < 0.40`, force safe profile remap.
- If `energy_budget > 0.80`, cap particle amplitude.
- If `counterfactual_depth < 0.20` and risk high, halt exploratory transitions.

## Transition Use

Transitions may branch using 8D thresholds, e.g.:

- Stable trajectory if `temporal_stability >= 0.70`.
- De-escalate if `intent_confidence < 0.50`.
- Lock novelty if `novelty_pressure > 0.65`.

## Governor Assumptions

The IR enters governor at `validate` stage and is rechecked after `clamp` stage.

Required invariants:

1. all 8 keys present,
2. all numeric finite,
3. all values normalized to `[0,1]`,
4. precision canonicalized to 4 decimals,
5. checksum/replay hash deterministic.

## Evaluation Criteria for 8D Quality

- **Completeness:** 8/8 dimensions present.
- **Stability:** repeated compile over same input yields exact float strings.
- **Safety utility:** safety-trigger scenarios correctly modify profile or transitions.
- **Counterfactual utility:** alternative branches represented without nondeterministic tie-breaks.

## Phase A Constraint

8D Presence IR is a contract surface only. It does not execute rendering behavior.
