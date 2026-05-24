# Changelog

## Iteration Z

- Added new canonical `presence8d/v1` contract schema with strict required envelope fields (`ir_version`, `tick`, `timestamp_ns`, `intent`, `presence8d`, `governor`, `normalization`).
- Enforced unit-interval bounds and closed object parsing (`additionalProperties: false`) for intent/presence/governor/normalization sections.
- Added precision metadata policy (`precision_dp = 4`, `rounding_policy = half_even`) and dp4 validation enforcement in contract checks.
- Extended contract checker/fuzzer fixtures to include `presence8d_v1` and a regression case for over-precision rejection.
- Compatibility note: this is additive (`presence8d/v1`), no migration required for existing contracts unless opting into this ingress envelope.


## Iteration Y

- Fixed documentation typos and wording inconsistencies across gateway/runtime references.
- Documented the websocket gateway auth bugfix that adds the missing `hmac` import in the WS ticket-signature path.
- Normalized development-port guidance in docs to a consistent local API port (`8000`).
- Documented websocket-auth regression test coverage to prevent ticket-signature/auth drift.
- Scope note: this update is documentation-only and does not change runtime behavior or contract semantics.

## Iteration X

- Home is now a **pure light-native scene** (canvas + Settings entry only).
- Structural UI (composer, runtime controls, voice, connection, export) is moved into **Settings**.
- Input event handling was modernized to correctly support **IME composition** (Thai/Japanese/etc.) using composition lifecycle + `beforeinput/input` paths, and now blocks accidental Enter-submit from browser IME process-key events (e.g. `keyCode=229`).
