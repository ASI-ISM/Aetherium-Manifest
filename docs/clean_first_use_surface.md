# Clean First-Use Surface

This document describes the refactored homepage runtime for Aetherium Manifest.

## First-view contract

The homepage intentionally renders only:

- Full-screen manifestation canvas (light field).
- Minimal bottom composer.
- One Settings button.
- Subtle human-readable status text.

No dashboard/HUD/debug panels are shown on first view.

## Module split

- `clean-first-surface.js`
  - `manifestText`: text-from-light orchestration and readable fallback.
  - `chooseLanguage`: deterministic language selection with session memory.
  - `routeResponse`: first-run deterministic response rules.
  - `initVoice`: progressive speech enhancement with graceful fallback.
- `clean-first-surface.css`
  - calm visual language, keyboard focus visibility, and reduced motion behavior.

## Language detection strategy

Resolution order:

1. Explicit user preference in Settings.
2. Browser locale (`navigator.languages` / `navigator.language`).
3. Input heuristics (Thai unicode range vs Latin range).
4. Optional local detector rules (pluggable and safe when disabled).
5. Session language memory.

## Settings as single advanced-control surface

All advanced controls are kept inside Settings:

- API/WS base paths.
- Runtime mode and telemetry options.
- Lineage/replay/scholar/governor/developer toggles.
- Language and voice options.
- Session audit export.

## Limitations

- Current language detector is heuristic and local-rule based (no heavy ML model).
- Voice input depends on browser SpeechRecognition availability.
- Exported session audit is local file download and in-memory only.
