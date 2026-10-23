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
