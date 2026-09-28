# Lab Validation Evidence — 2026-09-25

Status: **OBSERVED**

Environment: local Docker/WSL lab using the BFDB emulator and telemetry gateway.

This document records what was directly observed. It does not promote emulator behavior into proof of real field-device behavior.

> **Identity correction — 2026-09-28:** the emulator version used for this 2026-09-25 evidence still emitted a flat raw-point sequence such as `0_1_25` through `0_1_96`. That representation is now classified as a modeling defect and is **superseded**. The corrected emulator emits four 24-position groups: `0_1_1..24`, `0_2_1..24`, `0_3_1..24`, `0_4_1..24`. The electrical, transport, TSDB and Modbus observations in this document remain historical evidence, but the old flat raw IDs must not be used as the current expected MQTT identity shape.

## 1. Continuous MQTT TX/RX

The emulator continuously published three topic families and the gateway consumed the corresponding messages.

Representative sequence:

```text
field-emulator   MQTT_TX data/dev/EMU-BFDB-01 msgid=1771 points=24
field-emulator   MQTT_TX data/dev/EMU-BFDB-02 msgid=1772 points=24
field-emulator   MQTT_TX data/dev/EMU-BFDB-03 msgid=1773 points=24

telemetry-gateway MQTT_RX data/dev/EMU-BFDB-01 msgid=1771 points=24
telemetry-gateway MQTT_RX data/dev/EMU-BFDB-02 msgid=1772 points=24
telemetry-gateway MQTT_RX data/dev/EMU-BFDB-03 msgid=1773 points=24
```

The sequence continued through later msgids without an observed gap in the pasted sample.

## 2. TimescaleDB persistence

A direct query against `telemetry_samples` returned live BFDB-01 rows.

Representative values:

| Circuit | Voltage V | Current A | Power W | Energy kWh |
|---:|---:|---:|---:|---:|
| 49 | 12.25 | 1.76 | 21.51 | 0.7424 |
| 50 | 12.24 | 13.23 | 161.94 | 0.7558 |
| 60 | 12.24 | 13.34 | 163.39 | 0.8588 |
| 66 | 12.22 | 3.27 | 40.00 | 0.9120 |

Power is consistent with the electrical model within expected rounding. Example:

```text
12.24 V × 13.23 A ≈ 161.94 W
```

## 3. Modbus TCP read

A direct read from the lab Modbus server succeeded:

```text
Unit ID 3 Circuit 01
Voltage = 13.8100 V
Current = 7.9400 A
Power   = 109.6000 W
Energy  = 0.266200 kWh
```

This proves the current-state -> register projection -> Modbus TCP read path for the emulated lab.

## 4. Independent RAW MQTT inspection

A separate `mosquitto_sub` client subscribed directly to the broker using the reviewer account:

```bash
mosquitto_sub \
  -h mosquitto \
  -p 1883 \
  -u bfdb-reviewer \
  -P "<reviewer password>" \
  -t 'data/dev/EMU-BFDB-03' \
  -v
```

Representative RAW structure:

```text
data/dev/EMU-BFDB-03 {"msgid":"2289","method":"update","sn":"EMU-BFDB-03",...}
```

This verifies the important separation:

```text
MQTT topic  = data/dev/EMU-BFDB-03
MQTT payload = JSON object
```

The topic is not embedded as a synthetic JSON wrapper.

## 5. 96-circuit rotation — historical pre-correction run

The 2026-09-25 emulator rotated logical circuit batches of 24, but encoded them incorrectly as flat raw IDs under `0_1_*`.

The corrected expected wire sequence is:

```text
0_1_1  .. 0_1_24
0_2_1  .. 0_2_24
0_3_1  .. 0_3_24
0_4_1  .. 0_4_24
```

The logical coverage remains 96 circuits; only the raw MQTT identity representation changed.

## 6. Electrical coherence

Representative RAW point:

```text
Circuit 34
U1 = 13.83 V
I1 = 11.77 A
P1 = 162.78 W
```

```text
13.83 × 11.77 ≈ 162.78
```

Another observed point:

```text
Circuit 45
U1 = 13.78 V
I1 = 13.34 A
P1 = 183.80 W
```

The emulator is therefore not independently randomizing V/I/P.

## 7. Energy accumulation

The same synthetic circuit was observed with increasing `EP1` across later messages, e.g. approximately:

```text
0.7500 -> 0.7503
```

This is consistent with the emulator's cumulative energy model.

## 8. Partial update behavior

A direct RAW MQTT message was observed where one point contained only:

```json
"0_1_49": {
  "state": "ONLINE"
}
```

The state-only semantic evidence remains useful, but the raw point id shown above came from the superseded flat-identity emulator. In the corrected emulator the equivalent logical Circuit 49 is represented as `0_3_1`.

while other points in the same message contained electrical metrics.

This is the exact condition required to test:

```text
missing field != zero
missing field = not updated
```

Latest State must retain the previous V/I/P/E for that point.

## 9. External MQTT client through public TCP

An ephemeral reverse TCP tunnel was created and a separate MQTT Explorer connected through the public host/port.

The external client visibly received:

```text
data/dev/EMU-BFDB-01
data/dev/EMU-BFDB-02
data/dev/EMU-BFDB-03
```

The client showed continuously changing `msgid`, `timestamp`, `sendtime`, and payload content, demonstrating a live stream rather than a static snapshot.

This closes **RAW external inspection for the emulator path**.

## 10. Authentication/ACL path

The remote broker profile uses:

```text
bfdb-emulator -> publish data/dev/#
bfdb-gateway  -> read data/dev/#
bfdb-reviewer -> read data/dev/#
```

The external reviewer uses `bfdb-reviewer`.

## What this evidence does NOT prove

It does not yet prove:

- real AMC16Z-FDK24/AWT100 substitution;
- physical serial -> BFDB mapping;
- physical raw point -> circuit mapping;
- real field publish cadence or QoS behavior;
- real negative-flow scenario behavior in the emulator;
- complete failure/reconnect certification;
- Metasys compatibility;
- FC03 vs FC04;
- final FLOAT32 word/byte order;
- production security.

## Result

The emulated vertical slice has repeatable evidence for:

```text
Emulator
  -> RAW MQTT
  -> Gateway ingestion
  -> TimescaleDB
  -> Latest State / register projection
  -> Modbus TCP
```

Field PoC closure remains a later gate.
