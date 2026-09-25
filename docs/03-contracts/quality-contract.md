# Quality Contract

Per-circuit quality word uses Input Registers 896..991.

Bits:
- bit 0 voltage valid/fresh
- bit 1 current valid/fresh
- bit 2 power valid/fresh
- bit 3 energy valid/fresh
- bit 4 any known metric stale
- bit 5 data seen
- bit 6 last state ONLINE
- bit 7 invalid/non-ONLINE state

Derived labels: MISSING, PARTIAL, GOOD, STALE, INVALID.

Numeric last-known values are retained during staleness; quality communicates trust.
