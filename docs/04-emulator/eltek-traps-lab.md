# Eltek rev54 synthetic trap laboratory

This is a laboratory emitter, not a hardware emulator certification. Existing read-only agents,
MQTT publishers and gateway behavior remain unchanged. `apps/snmp-emulator/eltek-traps.mjs`
uses the supplied Eltek eNexus rev54 notification and generic alarm varbind OIDs.

```bash
cd apps/snmp-emulator
npm ci
npm run traps
```

Supply credentials through a private environment file/shell. Configuration:

| Variable                                               | Meaning                                                |
| ------------------------------------------------------ | ------------------------------------------------------ |
| SNMP_TRAP_TARGET_HOST / SNMP_TRAP_TARGET_PORT          | Receiver, default loopback UDP 1162                    |
| SNMP_VERSION                                           | 1, 2c or 3 (default 3)                                 |
| SNMP_COMMUNITY                                         | Private v1/v2c community                               |
| SNMP_V3_USERNAME / SNMP_V3_AUTH_KEY / SNMP_V3_PRIV_KEY | authPriv SHA/AES test credentials                      |
| SNMP_TRAP_NAME                                         | Exact notification name, or ALL for all 16             |
| SNMP_TRAP_ACTIVE                                       | true to activate, false to clear the same condition    |
| SNMP_TRAP_UNKNOWN                                      | true adds a synthetic enterprise OID with binary bytes |
| SNMP_TRAP_INFORM                                       | true uses informs; v1 rejects this                     |

Source identity is resolved at Site Mapper by sender IP/version/principal. For three controllers,
configure three distinct communities or users and receiver/source profiles. A fourth source needs
configuration, not new emulator logic. Pause/restart the sender to exercise silence/recovery;
silence is not a native electrical alarm. The generic measured integer is synthetic and has no
engineering scale until the corresponding Site Mapper profile is commissioned.

`node --test eltek-traps.test.mjs` transmits every notification over actual UDP and checks receipt,
binary unknown fields and explicit alarm clear values. Existing module tests remain included.
The Site Mapper companion branch contains the durable receiver, source-scoped ingestion,
transactional catalog/history, optional read-only polling and stable Modbus extension manifest.
Run its `test:industrial:mongo` with BFDB_TRAPS_MODULE pointing to this emitter for the complete
MQTT/SNMP -> MongoDB -> Modbus -> restart/clear laboratory chain.

## Closure revision — static implementation only

No tests, emulator scenario or simulation was run or added during this revision. Earlier UDP
verification describes the previous PR baseline, not these changes.

`infoHeartBeatTrap` now includes `alarmSubsysSourceDescr` as specified by the supplied rev54 MIB.
Set `SNMP_TRAP_MEASUREMENT` to `voltage`, `current` or `temperature`; `SNMP_TRAP_RAW_VALUE` may
supply an Integer32. The explicit synthetic encodings are:

| Scenario    | Measured OID                  | Default raw | Explicit laboratory scale |
| ----------- | ----------------------------- | ----------: | ------------------------- |
| voltage     | 1.3.6.1.4.1.12148.10.10.5.5.0 |         480 | ×0.1 V                    |
| current     | 1.3.6.1.4.1.12148.10.9.2.5.0  |         125 | ×0.1 A                    |
| temperature | 1.3.6.1.4.1.12148.10.10.7.5.0 |         253 | ×0.1 degC                 |

The generic trap varbinds reference these actual measured-object OIDs. Site Mapper applies the
configured interpretation to the referenced OID and retains the generic varbinds as original
capture evidence. These values/scales are synthetic; firmware decimal settings and temperature
units must be commissioned before field use. Unknown binary fields and explicit alarm ON/OFF
remain available. Existing GET agents and MQTT emulator behavior are unchanged.

Deferred: inspect heartbeat objects and numeric normalization, transport versions/informs,
alarm clear/restart/freshness and Modbus reads in the user's laboratory. No new certification
or main merge is claimed.

## Unified Site Mapper revision (implementation only)

This revision adds `eltek-sequence.mjs` and `eltek-lab-service.mjs`, plus
`config/eltek-sequence.example.json`. No emulator, suite, integration run or build was executed
for this change. Local acceptance remains pending. Historical evidence above applies only to its
stated older commit.

The sequence validates all steps before sending, accepts bounded explicit delays and optional repeat,
and uses the existing `sendEltekTrap`/`trapScenario` contract. `ALL` expands the 16 original rev54
notifications. The example covers explicit ON/OFF, measured voltage/current/temperature, heartbeat
and an unknown binary varbind. V1/v2c/v3 and informs are available through the standalone sender;
unified Site Mapper uses SNMPv3 authPriv informs. A sequence failure fails the process so Compose
can restart it; there is no claim of transport/database acceptance from a sender log alone.

The optional combined lab service publishes synthetic Integer32 GET scalars at the same rev54 OIDs
used in measured-object notifications, plus a power-system enum. It requires v3 authPriv, exposes
read-only access, and advances values from the configured sequence. Existing generic/Delta agents
and MQTT partial-update/electrical behavior remain intact. The MQTT message counter starts from
nanosecond epoch rather than resetting to 1000, preserving numeric string IDs while preventing
reused IDs after emulator restart.

Use the launcher in the existing Site Mapper PR #103:

```bash
python3 scripts/telemetry/industrial-lab.py --bfdb-dir /absolute/path/to/this/bfdb-checkout
# Review generated private configuration, then run locally:
python3 scripts/telemetry/industrial-lab.py --bfdb-dir /absolute/path/to/this/bfdb-checkout --action up
```

Run that command from the Site Mapper checkout. It starts this repository's broker/MQTT emulator
and three synthetic SNMP agent/emitters, with fixed origins on a dedicated private Docker network.
It does not invoke this repository's default Compose, telemetry-gateway, database or Modbus server.
Site Mapper owns gateway/Mongo/Timescale/Modbus. Credentials are generated privately outside tracked
files. Source serials `EMU-BFDB-01..03` match topics, profiles, logical aliases and the Modbus unit map.
The Site Mapper runbook `docs/telemetry/industrial-unified-lab.md` includes exact ownership, startup,
diagnostics, versioned CSV, LAB/FIELD substitution and the local acceptance checklist.

## Real UDP + TimescaleDB acceptance (2026-10-28, emulated hardware)

The opt-in `eltek-rich-sweep.mjs` emits exactly 5,407 distinct lab SNMP
signals, batched at <=24 varbinds per UDP PDU. Values mirror the original
inventory's *types and distributions* without ingesting the customer's Excel
or exposing real serial numbers, addresses, credentials or proprietary site
identities. Rev54 known OIDs are used for voltage (5389), load current (91),
fuse raw (86), disabled state (4), pushbutton observation (0), temperatures
and six physical-label examples. Remaining OIDs deliberately use a separate
private synthetic enterprise subtree. These are **not real Eltek OIDs**.

The original default remains unchanged. Enable `SNMP_LAB_SWEEP_COUNT=5407`
in the optional combined lab service. It emits an initial catalogue sweep,
then normal alarm ON/OFF + heartbeat sequence. Traps are event-driven in
field equipment: the lab sweep is a synthetic **capacity and fidelity test**,
not a statement that a physical controller broadcasts all MIB objects.

Companion Site Mapper PR #113 includes an opt-in launcher parameter
`--snmp-sweep-count 5407`, private x0.01 V / x1 A synthetic profile,
and read-only acceptance receipt for Mongo, Timescale raw, and FC03 value +
quality. The G10 workflow in this PR attempts the full stack using disposable
Docker services and no real BMS or controller. Only `LAB_PASS` from that
workflow establishes end-to-end simulated acceptance; the ordinary emulator
unit-test green status does not. Real hardware certification remains open.
