# Traceability Matrix

| Requirement | Verification |
|---|---|
| 3 BFDB x 96 circuits | emulator config/startup |
| 1,152 V/I/P/E values | register-map scale test |
| RAW MQTT inspectable | MQTT Explorer runbook |
| missing != zero | partial-merge unit test |
| Power approximately V x I | electrical-model test |
| Energy accumulates | electrical-model test + TSDB trend |
| Historical persistence | Timescale query |
| Unit IDs 1/2/3 | Modbus reader |
| Stale visible without erasing value | quality tests/runbook |
| Site Mapper untouched | repository boundary review |
