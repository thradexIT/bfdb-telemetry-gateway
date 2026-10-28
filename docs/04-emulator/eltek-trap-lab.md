# Optional Eltek-like SNMP Trap / Inform emulator — industrial acceptance

**LAB ONLY.** Real UDP SNMPv2c/v3 authPriv packets; **not** a claim of certified Eltek
firmware or a reproduction of the vendor's complete 5,407-record SNMP WALK.

The existing MQTT circuit emulator and read-only SNMP GET agents are unchanged.
This separate opt-in sender rotates **heterogeneous varbinds**: four feed input
profiles when selected, voltage/current integer deci-units, states (normal,
warning, disabled), zeros, command-like codes as *read-only observations*,
binary OCTET STRING, text, auxiliary integers and previously unseen instance OIDs.
The generator is dynamic but synthetic. No SNMP SET is performed.

A Trap is not a WALK. Expect multiple UDP packets with at most 24 varbinds each
(configurable 1–48), every 30 seconds by default. Each event is an observation,
not a promise that all enterprise OIDs will be present in one PDU. Source
addresses and SNMPv3 USM principals must match Site Mapper's
`SNMP_TRAP_SOURCES_JSON` authorization, and Site Mapper must have corresponding
`INDUSTRIAL_INGEST_SOURCES_JSON` and an industrial SNMP profile. Configure
`INDUSTRIAL_TIMESCALE_ENABLED=true` for per-signal TimescaleDB history.

## Run without modifying existing agent

From the BFDB repository, after `npm ci --prefix apps/snmp-emulator`,
set private SNMP environment values and execute:

```bash
SNMP_TRAP_TARGET_HOST=127.0.0.1 SNMP_TRAP_TARGET_PORT=1162 \
SNMP_EMULATOR_BFDB_ID=BFDB-01 SNMP_VERSION=3 \
SNMP_V3_USERNAME='<lab-user>' SNMP_V3_AUTH_KEY='<lab-auth>' \
SNMP_V3_PRIV_KEY='<lab-privacy>' SNMP_TRAP_ONCE=true \
node apps/snmp-emulator/trap-sender.mjs
```

Use `SNMP_TRAP_INFORM=true` only after confirming the receiver supports
acknowledgements and the correct SNMP principal. For v2c, specify a private
`SNMP_COMMUNITY` on an approved isolated lab network only.

## Operational acceptance (DO NOT claim field certification)

1. Verify Site Mapper's trap receiver logs/spool deliver all expected UDP batches.
2. Inspect `/telemetry` → universal industrial inspector. Check every event
   varbind as RAW with exact numeric OID/type/value, including zero/disabled/binary.
3. Verify Mongo original event, signal catalog and historical rows.
4. Query `industrial_observations` in Site Mapper TimescaleDB: signal IDs,
   original RAW values and quality must match the captured event; outbox must drain.
5. Approve an explicit mapping of a known interpreted numeric signal to the
   immutable extension registry (offset >=1024); read FC03 value and quality
   from the Site Mapper Modbus TCP sidecar. Check the published Metasys CSV.
6. With a **real** controller and **real** Metasys installation, repeat in the
   customer-approved OT segment with verified OIDs/scaling/Unit IDs and source
   authentication. This last step cannot be certified by an emulator.

**Do not alter** existing BDFB Unit 1–3 holding-register offsets 0–767.
Never convert unknown SNMP strings into engineering measurements.

## Complete vendor-volume stress mode (5,407 OIDs)

To test the observed number of supplier variables without relying on an Excel
or assuming a single trap includes a MIB WALK, set:
```bash
SNMP_TRAP_FULL_CATALOG=true SNMP_TRAP_ONCE=true node apps/snmp-emulator/trap-sender.mjs
```
This generates exactly **5,407 distinct synthetic numeric OID instances**
with diverse real BER data types and original values. At default 24 varbinds
per PDU, this produces **226 separate SNMP traps**. Each PDU is individually
bounded; Site Mapper's catalog limit of 10,000/source is not exceeded.
A UDP packet is NOT guaranteed delivery. Validate receiver counts, outbox
retries, sequence gaps, duplicates, Timescale writes, and partial packet failures
before calling the run accepted. Do not run full snapshots repeatedly at the
default 30-second interval against limited production storage: use one-shot
acceptance or explicitly size retention, disk and outbox throughput.
