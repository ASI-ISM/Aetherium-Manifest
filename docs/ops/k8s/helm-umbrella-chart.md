# Helm Umbrella Chart (Aetherium Manifest)

`charts/aetherium-manifest/` is an umbrella Helm chart intended to deploy **core Aetherium Manifest services** together with optional infrastructure subcharts.

## Scope
- Core service workloads stay in the main release namespace and should consume Governor-first contracts.
- Optional infra subcharts are wired as dependencies and can be toggled per environment:
  - Redis (state/session plane)
  - NATS (low-latency messaging)
  - Kafka (durable replay/audit path)
  - ClickHouse (telemetry sink)

## Environment toggles
- Per-subchart enable flags use `*.enabled` conditions.
- Shared infra groups can be controlled with Helm dependency `tags` (for example disabling all `messaging` deps in lightweight environments).
- Naming is centralized via chart helpers to reduce cross-environment collision risk.
