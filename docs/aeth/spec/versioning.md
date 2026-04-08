# AETH Versioning

Phase A version: `0.1.0`

Rules:
1. Grammar additions that do not change emitted JSON shape are minor changes.
2. Any emitted JSON shape change is ABI-affecting and requires:
   - version bump
   - golden fixture update
   - migration note
3. Reserved canonical states and Patimokkha rule names are protected symbols.
