# ADR-0002 — PostgreSQL + TimescaleDB

Status: Accepted for PoC

Decision: persist historical electrical telemetry in TimescaleDB.

Rationale:
- PostgreSQL/SQL operational model;
- time-oriented partitioning;
- future aggregation/downsampling path;
- suitable read boundary for Site Mapper.

Retention/compression policy remains deferred until real cadence is known.
