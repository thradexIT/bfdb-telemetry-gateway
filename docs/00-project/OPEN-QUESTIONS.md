# Open Questions

## Hardware / MQTT

- exact physical BFDB/circuit -> serial and raw point mapping;
- meaning of `0_1_n` vs `0_2_n`;
- U2/I2/P2/EP2 semantics;
- real publish cadence and batch size;
- real QoS level;
- clean-session/session-expiry behavior;
- reconnect behavior;
- duplicate/reordered delivery behavior;
- source clock accuracy and drift;
- whether one AWT serial always corresponds to one BFDB.

## Historical semantics

- finalize partial-electrical observation persistence representation;
- add and migrate `sendtime_at`;
- confirm retention/downsampling after measuring real field cadence;
- decide whether state/status events require a separate event table;
- decide whether any Latest State snapshot is persisted for restart recovery;
- define DB outage buffering/replay policy.

## Quality / stale

- final stale threshold for production;
- whether thresholds differ by metric/device;
- Metasys expectation for stale values vs invalid values;
- whether last-known numeric values remain exposed when stale;
- field behavior for OFFLINE state with still-present metrics.

## Metasys

- installed Metasys version;
- integration engine: SNE/SNC/NAE/OAS/etc.;
- accepted Unit IDs;
- FC03 or FC04;
- FLOAT32 byte order;
- FLOAT32 word order;
- polling interval;
- timeout;
- retry count;
- behavior on stale/invalid quality;
- network/firewall topology;
- final production IP/port.

## Product hardening

- health endpoint contract;
- metrics/monitoring stack;
- structured log format;
- migration tooling;
- secret-management system;
- TLS certificate lifecycle;
- durable ingest queue strategy;
- state-recovery policy after restart.

## Remote review

The current Pinggy endpoint is intentionally ephemeral. It is not a production ingress design.

Open production question: which approved encrypted remote-support pattern, if any, should exist for field diagnostics?
