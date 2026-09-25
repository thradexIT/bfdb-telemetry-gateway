# Traceability Matrix

| Requirement | Verification | Current state |
|---|---|---|
| 3 BFDB × 96 circuits | emulator config + RAW batch rotation | PASS emulator |
| 1,152 V/I/P/E values | scale/config + Modbus map | PASS design/emulator |
| RAW MQTT inspectable locally | `mosquitto_sub` / MQTT Explorer | PASS |
| RAW MQTT inspectable externally | remote MQTT Explorer over TCP tunnel | PASS emulator |
| topic/payload remain separate | direct RAW subscription | PASS |
| missing != zero | partial-merge unit test + state-only RAW event | PASS Latest State |
| explicit zero is zero | normalizer unit test | PASS |
| Power ≈ V × I | electrical-model test + RAW samples | PASS |
| Energy accumulates | electrical-model test + repeated RAW observation | PASS |
| Historical persistence | Timescale query | PASS basic persistence |
| Historical partial-patch correctness | patch-level observation test | OPEN / correction required |
| `sendtime` persisted explicitly | schema inspection | OPEN |
| Unit IDs 1/2/3 | Modbus reader | PASS lab |
| FLOAT32 decode | unit tests + direct Modbus read | PASS lab |
| Stale visible without erasing value | quality logic + runbook | IMPLEMENTED, E2E scenario proof open |
| Broker reconnect | failure test | OPEN |
| Malformed payload handling | unit/integration negative test | PARTIAL |
| DB outage durability | failure/replay test | OPEN |
| Real AWT/AMC substitution | physical test | OPEN |
| Real identity mapping | field evidence | OPEN |
| Metasys compatibility | commissioning | OPEN |
| Site Mapper UI untouched | repository boundary review | PASS |
