# ADR-0005 — In-memory Latest State

Status: Accepted for PoC

Modbus reads an in-memory register/state projection and never synchronously queries the TSDB.

After restart, v0.1 starts MISSING until fresh telemetry arrives.

Future durable rehydration may restore last-known values only if they remain marked stale/invalid until reconfirmed by field data.
