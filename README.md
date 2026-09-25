# BFDB Telemetry Gateway

PoC v0.1 product-shaped gateway for 3 BFDB × 96 circuits.

## Scope
- MQTT RAW ingestion/inspection
- partial-update merge
- Latest State + quality/stale
- TimescaleDB historical persistence
- Modbus TCP projection
- Site Mapper UI remains out of scope

## Scale
- 3 BFDB
- 96 circuits/BFDB
- 4 metrics/circuit: Voltage, Current, Power, Energy
- 288 circuits
- 1,152 FLOAT32 telemetry values
- 2,304 16-bit Modbus registers

## Quick start
```bash
cp .env.example .env
docker compose up --build
```

Ports: MQTT 1883, Timescale/PostgreSQL 5432, Modbus TCP lab 1502.

### MQTT Explorer
Connect to Docker host IP:1883 and inspect `data/dev/#`.

### TSDB
```bash
docker compose exec timescaledb psql -U bfdb -d bfdb -c "SELECT observed_at,bfdb_id,circuit_id,voltage_v,current_a,power_w,energy_kwh FROM telemetry_samples ORDER BY observed_at DESC LIMIT 20;"
```

### Modbus
```bash
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 1 --circuit 1
```

Critical rules: missing MQTT field != zero; explicit "0.00" = zero; partial updates merge per field; Modbus never queries MQTT/TSDB synchronously; emulator identity mapping is synthetic and not a physical mapping claim.
