# Project Status — PoC v0.1

Last updated: 2026-09-28

## Executive state

The **emulated executable vertical slice is working**:

```text
Emulator
  -> MQTT broker
  -> parser / identity / normalization
  -> Latest State
  -> TimescaleDB
  -> Modbus register projection
  -> Modbus TCP client
```

RAW MQTT has also been observed independently both locally and from an external MQTT Explorer through an ephemeral public TCP tunnel.

This does **not** mean the field PoC or product is finished.

## Gate status

| Gate | Scope | Status |
|---|---|---|
| D0 | Documentation / baseline contracts | ACTIVE / substantially materialized |
| B1 | Repository + container scaffold | DONE |
| B2 | MQTT broker + electrical emulator | DONE |
| B3 | RAW MQTT independent inspection | DONE for emulator, including external client |
| B4 | Parser + identity + partial merge | DONE for synthetic identity model |
| B5 | Latest State + quality/stale | IMPLEMENTED, scenario certification incomplete |
| B6 | Timescale persistence | IMPLEMENTED, historical partial-patch semantics correction open |
| B7 | Modbus projection | DONE in lab |
| B8 | 3 BFDB × 96 circuits | CORRECTED to 4 × 24 panelized raw identities; validation in current PR |
| B9 | Emulated E2E | DONE in automated smoke; additional negative-path certification open |
| B10 | Real AMC/AWT hardware substitution | NOT DONE |
| B11 | Metasys commissioning | NOT DONE |

## Verified/observed lab outcomes

On 2026-09-25:

- three emulator MQTT topics were continuously published and received;
- TimescaleDB returned live rows with coherent V/I/P/E;
- Modbus TCP Unit 3 / Circuit 1 returned V/I/P/E successfully;
- `mosquitto_sub` independently observed the exact RAW topic/payload stream;
- the emulator emitted a state-only partial patch for one point;
- an external MQTT Explorer connected to the broker through Pinggy TCP and saw all three topics.

See [lab evidence](../01-evidence/lab-validation-2026-09-25.md).

## Identity correction — 2026-09-28

The previous emulator emitted flat raw point ids such as `0_1_25` through `0_1_96`. That representation is now rejected as inconsistent with the reviewed 24-position panel model.

Corrected synthetic mapping:

```text
1..24  -> 0_1_1 .. 0_1_24
25..48 -> 0_2_1 .. 0_2_24
49..72 -> 0_3_1 .. 0_3_24
73..96 -> 0_4_1 .. 0_4_24
```

The third component is constrained to `1..24`. The real field meaning of groups 3/4 remains TBD; their use in the emulator is synthetic only.

## Known technical gaps

### Historical observation semantics

Current v0.1 writes a TSDB row when an accepted patch changes at least one electrical metric, but the repository currently passes the merged Latest State snapshot to persistence.

That means a partial electrical patch can carry forward older metrics into the new row. `changed_fields` records what changed, but the wide row can still look as if every populated value was sampled at the new `observed_at`.

Target correction:

- persist only metrics actually present/accepted in the patch, or equivalent per-metric observed flags/timestamps;
- keep merging exclusively in Latest State;
- add explicit `sendtime_at` persistence.

### Failure scenarios

Design constants/documentation exist for:

- zero load;
- load step;
- reverse flow;
- offline/stale;
- malformed payload;
- reconnect.

Not all are yet executable and E2E-certified.

### Database durability

The current repository reconnects after DB failure, but it does not yet provide a durable local queue guaranteeing that the triggering observation is replayed after an outage.

### Operations

Not yet implemented as production features:

- HTTP health endpoint;
- metrics endpoint;
- fully structured JSON logging;
- managed migrations beyond initial schema bootstrap;
- production secrets manager;
- production TLS;
- state recovery/persistence policy across process restart.

## Field/commissioning gaps

Still requires evidence:

- actual AWT serial -> BFDB mapping;
- actual raw point -> physical circuit mapping;
- `0_1_n` / `0_2_n` semantics;
- U2/I2/P2/EP2 meaning;
- real publish cadence/batching;
- real MQTT QoS/session/reconnect behavior.

Still requires Metasys integrator decision:

- installed Metasys version/engine;
- FC03 vs FC04;
- Unit ID support;
- FLOAT32 word/byte order;
- polling interval;
- timeout/retries;
- stale/invalid handling;
- production IP/network/firewall parameters.

## Definition of PoC closure

The PoC should not be called field-closed until:

1. real field MQTT replaces the emulator without architectural redesign;
2. physical identity mapping is evidenced;
3. one known physical circuit is traced RAW MQTT -> historical observation -> Latest State -> Modbus;
4. partial/stale/reconnect behavior is demonstrated;
5. Metasys successfully reads agreed registers;
6. register function, addressing and endianness are signed off;
7. commissioning evidence is captured.
