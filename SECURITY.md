# Security Policy

## Supported Versions

The repository is currently pre-1.0 and maintained on a rolling basis from `main`.
Security fixes are prioritized for the latest commit history and active release artifacts.

| Version | Supported |
| --- | --- |
| main (latest) | ✅ |
| historical snapshots | ⚠️ best effort only |

## Reporting a Vulnerability

Please report vulnerabilities privately and include enough detail for deterministic reproduction.

- Preferred channel: create a private security report to project maintainers (do **not** open a public issue for unpatched vulnerabilities).
- Include:
  - affected component/file path
  - impact assessment (confidentiality/integrity/availability/safety)
  - reproduction steps and payload samples
  - observed logs/trace IDs and runtime context
  - suggested mitigation (if available)

## Response Targets

- Initial acknowledgement: within **3 business days**.
- Triage decision and severity classification: within **7 business days** after acknowledgement.
- Mitigation plan or compensating control: as soon as validated, based on severity and exploitability.

## Scope Notes

Given the architecture of Aetherium Manifest:

- Treat all model output as untrusted input.
- Runtime Governor policy checks are the canonical control boundary.
- Prototype telemetry/state-sync stores are currently in-memory and non-durable.
- Contract/schema changes are ABI changes and require governance review.

## Safe Harbor

Good-faith security research and responsible disclosure are welcomed. Please avoid privacy violations, destructive testing, service disruption, and social engineering.
