# AETH Compiler (Phase A Scaffold)

## Status

This directory defines the intended compile pipeline and interfaces for AETH language processing in Phase A.

**Renderer implementation is intentionally not included.**

## Purpose

Compile `.aeth` Visual Contract Language files into deterministic, governor-ready control artifacts:

1. Parse AETH source.
2. Normalize to canonical AST.
3. Lower to 8D Presence IR + transition graph.
4. Validate against `contracts/aeth-control.schema.json`.
5. Emit deterministic JSON artifact + replay hash.

## Planned Pipeline

`lex -> parse -> ast_normalize -> semantic_validate -> lower_presence8d -> lower_transitions -> schema_validate -> governor_preflight -> emit`

### Stage Notes

- `lex/parse`:
  - Deterministic token stream.
  - Stable parse errors with line/column.
- `ast_normalize`:
  - Canonical key ordering.
  - Default expansion only from explicit spec defaults.
- `semantic_validate`:
  - Context key resolution.
  - Rule/action constraints.
  - Transition boundedness checks.
- `lower_presence8d`:
  - Exactly 8 required dimensions.
  - Float precision canonicalized to 4 decimals.
- `schema_validate`:
  - Must pass `aeth-control.schema.json`.
- `governor_preflight`:
  - Enforce assumptions about deny-by-default and safe mode fallback.

## Compiler Assumptions

- Input is untrusted.
- No non-deterministic operators are accepted.
- Any unknown capability must fail closed.
- All output must be replayable from source + context.

## Determinism Contract

For identical `(source, context, compiler_version)` tuple, compiler must produce identical:

- normalized AST hash,
- emitted contract JSON bytes,
- replay hash.

## Fixture Usage

Phase A fixture examples are under:

- `tests/fixtures/aeth/thinking_vortex.aeth`
- `tests/fixtures/aeth/warning_safe_mode.aeth`

These examples are deterministic and can be used for parser/semantic smoke tests.

## Future (Out of Scope for Phase A)

- Runtime renderer packet streaming.
- Live telemetry-backed adaptive remapping.
- Multi-agent synchronized scene arbitration.
