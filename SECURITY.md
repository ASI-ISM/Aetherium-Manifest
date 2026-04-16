# Security Policy

## Supported versions

Aetherium Manifest is pre-1.0 and maintained as a rolling `main` branch.

| Version | Supported |
| --- | --- |
| `main` (latest) | ✅ Yes |
| Historical commits/snapshots | ⚠️ Best effort |

## Report a vulnerability

Please report security issues privately to maintainers and do **not** disclose unpatched vulnerabilities publicly.

Include:

1. affected component and file path
2. reproduction steps and payload example
3. impact (confidentiality/integrity/availability/safety)
4. logs, trace IDs, and runtime context
5. suggested mitigation (optional)

## Response targets

- Acknowledgement: within **3 business days**
- Triage and severity: within **7 business days** after acknowledgement
- Mitigation plan: as soon as validated based on severity/exploitability

## System-specific security rules

1. Treat all model output as **untrusted input**.
2. Keep governor policy path as canonical mutation boundary.
3. Enforce deny-by-default behavior for renderer controls and external proxying.
4. Consider schema changes as ABI-impacting and require compatibility review.
5. Prefer deterministic observability: log trace/session IDs for replay and incident response.

## Safe harbor

Good-faith, non-destructive security research is welcome. Avoid privacy violations, service disruption, data exfiltration, and social engineering.
