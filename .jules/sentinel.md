## 2026-04-11 - [Security Theater Authentication Pattern]
**Vulnerability:** API and WS gateways used "Security Theater" authentication, checking only for the presence of an API key header/query parameter without validating its actual value.
**Learning:** Initial prototype logic prioritized "presence" to enable quick testing but failed to enforce "identity," leaving the system open to any non-empty string as a credential.
**Prevention:** Always validate credentials against a trusted source (like an environment variable or secure vault) even in early prototype stages. Ensure "Fail Securely" by returning 401/403 on invalid values, not just missing ones.
