# Changelog

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
