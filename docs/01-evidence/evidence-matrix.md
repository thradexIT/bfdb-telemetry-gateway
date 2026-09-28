# Evidence Matrix

| Statement | Status | Evidence / note |
|---|---|---|
| Topic family `data/dev/<serial>` | OBSERVED | Field captures + emulator RAW inspection |
| Payload contains msgid/method/sn/timestamp/sendtime/version/reported | OBSERVED | Field captures + emulator RAW inspection |
| MQTT updates can be partial | OBSERVED | Field captures |
| A point may contain state only | OBSERVED | Field captures and emulator msgid 2280 lab observation |
| Numeric values are represented as strings in observed payloads | OBSERVED | RAW payloads |
| Missing field means zero | REJECTED | Partial-update contract |
| Explicit `"0.00"` is a real zero | DECISION backed by observed payload representation | Parser/normalizer tests |
| Power approximately tracks Voltage × Current | OBSERVED | Field captures and emulator lab evidence |
| Negative current/power exists in field captures | OBSERVED | Field capture |
| Emulator covers 3 BFDB × 96 synthetic circuits | VERIFIED in implementation/lab | Config + batch rotation |
| Panel/meter position count is 24 | SOURCE-SUPPORTED / DESIGN INPUT | Topology review: each panel/AMC has 24 positions |
| Flat emulator id `0_1_96` is coherent | REJECTED | Superseded modeling defect |
| Corrected emulator third component is limited to 1..24 | DECISION / TESTED | panelized encoder + resolver tests |
| Emulator publishes 24-point rotating batches | OBSERVED / VERIFIED in lab | RAW MQTT |
| RAW MQTT independently visible with `mosquitto_sub` | OBSERVED | 2026-09-25 lab |
| RAW MQTT visible from external MQTT Explorer through public TCP tunnel | OBSERVED | 2026-09-25 lab |
| TimescaleDB receives rows for emulated BFDB telemetry | OBSERVED | 2026-09-25 SQL query |
| Modbus Unit 3 Circuit 1 returns V/I/P/E | OBSERVED | 2026-09-25 direct reader |
| `0_1_n` equals physical Circuit n | TBD | Real mapping must not be generalized from emulator |
| Real frame B is encoded as `0_3_*` / `0_4_*` | TBD | Emulator uses this only as a synthetic 96-circuit grouping |
| one real serial equals one physical BFDB | TBD | Requires field mapping evidence |
| 3 Unit IDs behind one Modbus TCP endpoint | DECISION | Current architecture |
| FC04 is accepted by target Metasys | TBD | Requires integrator commissioning |
| High-word-first / big-endian is accepted by target Metasys | TBD | Requires commissioning |
| Pinggy free unauthenticated tunnel expired after 60 min warning | OBSERVED | 2026-09-25 lab session |
| ngrok free TCP worked without card | REJECTED for tested account | ERR_NGROK_8013 required card verification |
| Cloudflare Quick Tunnel provides direct native MQTT TCP endpoint | REJECTED for tested quick-tunnel approach | Quick Tunnel used HTTP endpoint, not native MQTT Desktop path |
