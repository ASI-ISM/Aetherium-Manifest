# Clean First-Use Surface (2026-04)

This document describes the redesigned first-view runtime surface in `index.html`.

## First-view contract

The landing surface intentionally exposes only:

- Full-screen manifestation light field canvas.
- A minimal bottom composer.
- A single Settings entry point.
- A subtle human-readable status line.

No runtime/debug/scholar/governor panels are shown on first view.

## Minimal language-aware response layer

The first-run response path is deterministic and local-first:

1. Explicit language preference from Settings (`auto`, `th`, `en`).
2. Browser locale fallback (`navigator.language`, `navigator.languages`).
3. Input text heuristics (Thai Unicode range and lightweight English keyword checks).
4. Deterministic language choice and response-rule application.
5. Session-level language memory for continuity.

## Response orchestration rules

Current baseline rules:

- Greeting input manifests greeting text from light.
- Gratitude input returns warm acknowledgment.
- Question-like input returns concise acknowledgment.
- Unknown/low-confidence input returns a soft fallback prompt.

All output is rendered as luminous text over the light field instead of heavy chat panels.

## Progressive enhancement strategy

- Voice remains optional and is controlled in Settings.
- Local language detector can be toggled in Settings.
- Motion can be reduced with system `prefers-reduced-motion` or Settings override.
- If advanced modules/backends are unavailable, local deterministic rules still work.

