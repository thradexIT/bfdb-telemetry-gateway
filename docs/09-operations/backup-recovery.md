# Backup and Recovery

PoC:
- TimescaleDB data is persisted in a Docker volume.
- Mosquitto persistence is enabled.
- Latest State is intentionally in-memory only.

Restart rule:
- do not rehydrate historical values as fresh;
- quality starts MISSING until new field telemetry arrives.

Production hardening should define database backup, restore tests, retained-history policy and optional stale-safe state rehydration.
