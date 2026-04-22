# Clean First-Use Surface

This document describes the refactored homepage runtime for Aetherium Manifest.

## First-view contract

The awakening surface intentionally renders only:

- A blank surface.
- One Settings button.

No dashboard, HUD, debug panel, scholar panel, lineage panel, runtime console, composer, or voice controls are shown in the first view.

## Module split

- `clean-first-surface.js`
  - App bootstrap and orchestration.
  - Settings Workspace wiring, persistence, and session audit export.
  - Browser-side transport mapping uses canonical routes only (`/api/v1/cognitive/generate`, `/api/v1/cognitive/validate`, `/api/v1/auth/session`, `/api/v1/auth/session/refresh`, `/ws/cognitive-stream`).
  - Legacy `/api/intent` remains backend-adapter scope only and is not exposed for browser direct-call fallback.
  - Deferred runtime bootstrap; WebSocket, voice, and manifestation rendering remain inactive until Settings opens the Interaction pane (or user action).
  - Settings workspace orchestration and audit export wiring.
- `first_use_surface/settings-store.js`
  - Session-safe persistence for workspace preferences and active pane migration.
  - Whitelisted persistence only (no raw token/key fields).
- `first_use_surface/settings-workspace.js`
  - Dialog open/close lifecycle, focus trap, Escape support, and pane navigation.
  - Responsive layout mode (`sheet` on desktop, `fullscreen` on mobile).
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
  - Runtime performs ticket bootstrap (`/api/v1/auth/session`) before WebSocket connect; it renews via `/api/v1/auth/session/refresh` when needed.
  - WS connect attaches short-lived ticket as query (`?ticket=<signed_ephemeral_ticket>`) and negotiates `aetherium-ticket-v1` subprotocol.
  - Security pane reflects live ticket state: `issued`, TTL countdown, or `renew required`.
  - `emitIntent(intent)` sends to `${apiBase}/generate` where `apiBase` defaults to `/api/v1/cognitive`.
  - Auth failures from canonical routes (401/403) are surfaced as `Session ticket required` in Security + Connectivity state instead of falling back to non-canonical endpoints.
  - `adaptIntentResponse(payload)` normalizes backend response into the existing frontend stream shape.

## Language detection strategy

Resolution order:

1. Explicit user preference in Settings.
2. Browser locale (`navigator.languages` / `navigator.language`) as base fallback signal.
3. Input inspection (character heuristics + optional local detector).
4. Deterministic language choice with confidence-based rules.
5. Session language memory update.

## Operational sanctum information architecture

All runtime controls are kept inside a seven-pane Settings Workspace (operational sanctum):

- Interaction
- Connectivity
- Accessibility
- Runtime
- Output/Audit
- Security
- Developer


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
