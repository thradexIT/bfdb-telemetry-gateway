# Lab Runbook

## 1. Start the local stack

```bash
cp .env.example .env
docker compose up --build
```

Expected log markers include:

```text
EMULATOR_READY
GATEWAY_READY
TSDB_CONNECTED
MQTT_CONNECTED
MODBUS_LISTEN
MQTT_TX
MQTT_RX
```

## 2. RAW MQTT

Local MQTT Explorer can connect to port 1883, or use:

```bash
docker run --rm -it \
  --network bfdb-telemetry-gateway_default \
  eclipse-mosquitto:2.0 \
  mosquitto_sub \
  -h mosquitto \
  -p 1883 \
  -t 'data/dev/#' \
  -v
```

Expected topic families:

```text
data/dev/EMU-BFDB-01
data/dev/EMU-BFDB-02
data/dev/EMU-BFDB-03
```

## 3. Historical persistence

```bash
docker compose exec timescaledb \
  psql -U bfdb -d bfdb \
  -c "SELECT observed_at,bfdb_id,circuit_id,voltage_v,current_a,power_w,energy_kwh
      FROM telemetry_samples
      ORDER BY observed_at DESC
      LIMIT 20;"
```

## 4. Modbus

Linux/WSL:

```bash
python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 1 --circuit 1
python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 2 --circuit 1
python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1
```

Windows PowerShell:

```powershell
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1
```

Bash line-continuation backslashes must not be pasted into PowerShell.

## 5. Same-circuit cross-layer comparison

For a deterministic comparison:

1. choose one BFDB/circuit;
2. observe the current RAW MQTT value;
3. optionally pause the emulator to stop value changes;
4. query the latest TSDB observation;
5. read the corresponding Modbus Unit ID/circuit;
6. compare V/I/P/E within expected rounding/FLOAT32 precision.

Example freeze:

```bash
docker compose pause field-emulator
```

Resume:

```bash
docker compose unpause field-emulator
```

If paused beyond the configured freshness threshold, quality may become STALE while numeric last-known values remain present. That is expected.

## 6. Partial update test

Observe a full point first, then a later state-only patch:

```json
{"state":"ONLINE"}
```

PASS:

- Latest State retains prior V/I/P/E;
- explicit missing fields are not converted to zero;
- Modbus keeps the last-known numeric values;
- quality/age evolves independently.

Historical semantics are subject to the known v0.1 persistence correction described in [ingestion policy](../05-timeseries/ingestion-policy.md).

## 7. External reviewer

For direct MQTT Explorer from another computer, follow:

[Remote MQTT Access](remote-mqtt-access.md)

## Pass boundary

The local emulated happy path passes when each BFDB has coherent V/I/P/E visible through required projections and RAW MQTT is independently inspectable.

Field PoC closure additionally requires real hardware substitution, identity evidence, failure-scenario proof, and Metasys commissioning.
