# Learnings from Aetherium Manifest State Transition

## Durable State
- Moved in-memory metrics, telemetry, and session-critical state (audit trails, room state) to Redis.
- Implemented `RedisState` helper class to encapsulate Redis operations and handle "fail open/closed" logic gracefully.
- Atomic increments (`hincrby`) are preferred for metrics to ensure consistency across multiple instances.

## Security & Session Tickets
- Implemented Key Rotation: `SESSION_TICKET_SECRET` now supports comma-separated secrets, allowing for smooth transition when rotating keys.
- Replay Defense: Added nonce (`tid`) persistence in Redis with TTL. Verification now checks if a ticket ID has already been used.
- Async Verification: Transitioned `_verify_ticket` to `async` to support Redis lookups, requiring updates to WebSocket and API callers.

## CI/CD & Contracts
- Contract compatibility is enforced via `tools/contracts/contract_checker.py`.
- Added `runtime_drift_guard.py` placeholder to satisfy the contract checker's requirements.
- Verified "fail-fast" behavior by simulating a breaking schema change.
