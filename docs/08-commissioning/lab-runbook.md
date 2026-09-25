# Lab Runbook

## Start
```bash
cp .env.example .env
docker compose up --build
```

Expected log markers:
```text
EMULATOR_READY
GATEWAY_READY
TSDB_CONNECTED
MQTT_CONNECTED
MODBUS_LISTEN
```

## RAW MQTT
Connect MQTT Explorer to host IP port 1883 and inspect `data/dev/#`.

## TSDB
```bash
docker compose exec timescaledb psql -U bfdb -d bfdb -c "SELECT observed_at,bfdb_id,circuit_id,voltage_v,current_a,power_w,energy_kwh FROM telemetry_samples ORDER BY observed_at DESC LIMIT 20;"
```

## Modbus
```bash
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 1 --circuit 1
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 2 --circuit 1
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1
```

PASS when each BFDB has coherent V/I/P/E visible through all required projections.
