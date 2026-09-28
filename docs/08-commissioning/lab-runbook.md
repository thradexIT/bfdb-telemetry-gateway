# Lab Runbook

## Objective

Bring up the complete emulator path and verify the same data through:

```text
RAW MQTT
TimescaleDB
Modbus TCP
```

## 1. Start

Recommended:

```bash
make up
```

Equivalent:

```bash
docker compose up -d --build
```

Check:

```bash
make ps
```

Logs:

```bash
make logs
```

Healthy markers include:

```text
EMULATOR_READY
MQTT_TX
MQTT_CONNECTED
MQTT_RX
TSDB_CONNECTED
GATEWAY_READY
MODBUS_LISTEN
```

## 2. Inspect RAW MQTT

```bash
make raw
```

Expected topics:

```text
data/dev/EMU-BFDB-01
data/dev/EMU-BFDB-02
data/dev/EMU-BFDB-03
```

Corrected point families:

```text
0_1_1 .. 0_1_24
0_2_1 .. 0_2_24
0_3_1 .. 0_3_24
0_4_1 .. 0_4_24
```

A value such as `0_1_96` means the wrong/superseded emulator revision is running.

## 3. Inspect TimescaleDB

```bash
make tsdb
```

The query returns:

- source observation timestamp;
- BFDB id;
- logical circuit id;
- raw point id;
- V/I/P/E.

## 4. Read Modbus

```bash
make modbus
```

Or explicitly:

```bash
python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 1 --circuit 1
python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 2 --circuit 1
python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1
```

Windows PowerShell:

```powershell
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1
```

## 5. Same-circuit comparison

Choose a BFDB/circuit.

Optionally freeze the source:

```bash
docker compose pause field-emulator
```

Compare:

```text
RAW MQTT raw_point_id/value
        ↓
TimescaleDB logical circuit row
        ↓
Modbus Unit ID + circuit
```

Resume:

```bash
docker compose unpause field-emulator
```

If the pause exceeds the freshness threshold, quality can become STALE while the last-known numeric value remains available.

## 6. Partial update behavior

A point may later contain only:

```json
{"state":"ONLINE"}
```

PASS behavior:

- missing electrical fields are not converted to zero;
- Latest State preserves previous V/I/P/E;
- Modbus retains last-known numeric values;
- explicit `"0.00"` still updates to zero;
- quality/freshness evolves separately.

The historical partial-observation semantic correction remains separately documented in the timeseries ingestion policy.

## 7. Authenticated remote review

To let another person use MQTT Explorer:

```bash
make remote-setup
make remote-up
make remote-creds
```

Then in another terminal:

```bash
make pinggy
```

Full instructions:

[Remote MQTT Access](remote-mqtt-access.md)

## 8. Stop

Local:

```bash
make down
```

Authenticated remote:

```bash
make remote-down
```

## Pass boundary

The emulated lab path passes when:

- RAW MQTT is independently visible;
- all three BFDB topics publish;
- point ids obey the 24-position model;
- TimescaleDB receives electrical telemetry;
- Modbus Units 1/2/3 return coherent V/I/P/E.

This does not by itself close real hardware/Metasys commissioning.
