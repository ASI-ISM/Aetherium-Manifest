# Clean First-Use Surface

This document describes the refactored homepage runtime for Aetherium Manifest.

## First-view contract

The homepage intentionally renders only:

- A blank surface.
- One Settings button.

No dashboard, HUD, debug panel, scholar panel, lineage panel, runtime console, composer, or voice controls are shown on first view.

## Module split

- `clean-first-surface.js`
  - App bootstrap and orchestration.
  - Settings Workspace wiring, persistence, and session audit export.
  - Compatibility adapter mapping (`/api/intent` + `/ws/cognitive-stream`).
  - Deferred runtime bootstrap; WebSocket, voice, and manifestation rendering remain inactive until Settings initializes runtime.
  - Settings drawer keyboard/mouse dismissal behavior.
- `first_use_surface/light-manifestation.js`
  - Luminous text renderer with glyph-sampling particle halo.
  - Calm ambient particle field.
  - Reduced-motion aware transitions.
  - Multi-line wrapping for readable long responses.
- `first_use_surface/language-layer.js`
  - Deterministic language choice with session memory.
  - Browser-locale + character-range baseline detection.
  - Optional local rule-based detector layer (pluggable).
- `clean-first-surface.js` intent transport
  - `adaptIntentRequest(intent, sessionId)` maps to compatibility payload `{ prompt, session_id, model, temperature }`.
  - `emitIntent(intent)` sends to `${apiBase}/intent`.
  - `adaptIntentResponse(payload)` normalizes backend response into the existing frontend stream shape.

## Language detection strategy

Resolution order:

1. Explicit user preference in Settings.
2. Browser locale (`navigator.languages` / `navigator.language`) as base fallback signal.
3. Input inspection (character heuristics + optional local detector).
4. Deterministic language choice with confidence-based rules.
5. Session language memory update.

## Settings as a single advanced-control surface

All advanced controls are kept inside Settings Workspace:

- API/WS base paths.
- Runtime mode and telemetry options.
- Lineage/replay/scholar/governor/developer toggles.
- Reduced-motion and language/voice/local-detector options.
- Optional voice capture trigger and session-audit export.
- Runtime initialization trigger (deferred startup gate).

## Fallback behavior

- If `SpeechRecognition` is not available, voice control disables itself without breaking the composer flow.
- If language detection confidence is low, the runtime uses deterministic fallback + session memory.
- If animations are reduced, luminous text remains readable without relying on motion cues.

## Limitations

- Current language detector is heuristic and local-rule based (no heavy ML model).
- Voice input depends on browser SpeechRecognition availability.
- Session audit export remains local-download plus in-memory trail.
- Composer now only produces intent; visual/business state is expected from validated stream events.
