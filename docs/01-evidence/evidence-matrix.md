# Evidence Matrix

| Statement | Status |
|---|---|
| Topic family `data/dev/<serial>` | OBSERVED |
| Payload contains msgid/method/sn/timestamp/sendtime/version/reported | OBSERVED |
| MQTT updates can be partial | OBSERVED |
| A point may contain state only | OBSERVED |
| Numeric values are represented as strings in observed payloads | OBSERVED |
| Missing field means zero | REJECTED |
| Power approximately tracks Voltage × Current | OBSERVED |
| Negative current/power exists in captures | OBSERVED |
| `0_1_n` equals physical Circuit n | TBD |
| one serial equals one BFDB | TBD |
| 3 Unit IDs behind one Modbus TCP endpoint | DECISION |
