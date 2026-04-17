# Clean First-Use Surface

This document describes the refactored homepage runtime for Aetherium Manifest.

## First-view contract

The homepage intentionally renders only:

- Full-screen manifestation canvas (light field).
- Minimal bottom composer.
- One Settings button.
- Subtle human-readable status text and a lightweight readable fallback line.

No dashboard/HUD/debug panels are shown on first view.

## Module split

- `clean-first-surface.js`
  - App bootstrap and orchestration.
  - Settings wiring and session audit export.
  - Voice progressive-enhancement integration.
- `first_use_surface/light-manifestation.js`
  - Luminous text renderer with glyph-sampling particle halo.
  - Calm ambient particle field.
  - Reduced-motion aware transitions.
- `first_use_surface/language-layer.js`
  - Deterministic language choice with session memory.
  - Browser-locale + character-range baseline detection.
  - Optional local rule-based detector layer.
- `first_use_surface/response-orchestrator.js`
  - Deterministic first-run response rules for greeting/gratitude/question/unknown intent.
  - Language mismatch adaptation message for preference/input divergence.

## Language detection strategy

Resolution order:

1. Explicit user preference in Settings.
2. Browser locale (`navigator.languages` / `navigator.language`) as deterministic default.
3. Input heuristics (Thai Unicode range vs Latin range).
4. Optional local detector rules (pluggable and safe when disabled).
5. Session language memory fallback.

## Settings as a single advanced-control surface

All advanced controls are kept inside Settings:

- API/WS base paths.
- Runtime mode and telemetry options.
- Lineage/replay/scholar/governor/developer toggles.
- Reduced-motion and language/voice/local-detector options.
- Session audit export.

## Fallback behavior

- If `SpeechRecognition` is not available, voice control disables itself without breaking composer input.
- If language confidence is low, the runtime falls back deterministically without external calls.
- If reduced motion is enabled, luminous text remains readable without relying on animation cues.

## Limitations

- Current language detector is heuristic and local-rule based (no heavy ML model).
- Voice input depends on browser SpeechRecognition availability.
- Session audit export remains local-download plus in-memory trail.
