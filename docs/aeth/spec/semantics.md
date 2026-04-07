# AETH Semantics

`state` declares the canonical visual state envelope.

Required:
- `state`
- `visual.shape`
- `visual.particle_density`
- `visual.turbulence`
- `visual.flow_direction`
- `visual.glow_intensity`
- `visual.palette`

Optional:
- `intent`
- `confidence`
- `rule`

Value constraints:
- `confidence`: 0.0 .. 1.0
- `particle_density`: 0.0 .. 1.0
- `turbulence`: 0.0 .. 1.0
- `glow_intensity`: 0.0 .. 1.0

Compile target:
- `state` remains the top-level runtime state
- `visual.flow_direction` becomes `visual.flow` (`inward=-1`, `outward=1`)
- `rule.enforce` becomes `policies[]`
- conditional rules become `constraints[]`
