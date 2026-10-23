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

| Variable | Meaning |
| --- | --- |
| SNMP_TRAP_TARGET_HOST / SNMP_TRAP_TARGET_PORT | Receiver, default loopback UDP 1162 |
| SNMP_VERSION | 1, 2c or 3 (default 3) |
| SNMP_COMMUNITY | Private v1/v2c community |
| SNMP_V3_USERNAME / SNMP_V3_AUTH_KEY / SNMP_V3_PRIV_KEY | authPriv SHA/AES test credentials |
| SNMP_TRAP_NAME | Exact notification name, or ALL for all 16 |
| SNMP_TRAP_ACTIVE | true to activate, false to clear the same condition |
| SNMP_TRAP_UNKNOWN | true adds a synthetic enterprise OID with binary bytes |
| SNMP_TRAP_INFORM | true uses informs; v1 rejects this |

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
