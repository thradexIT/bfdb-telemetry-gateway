# ICD — BFDB MQTT Telemetry Gateway ↔ Johnson Controls Metasys

Version: 0.1-DRAFT
Status: DRAFT

## 1. Roles
- BFDB Telemetry Gateway: Modbus TCP Server [FROZEN]
- Metasys: Modbus TCP Client [FROZEN]
- MQTT: asynchronous upstream source [FROZEN]
- TimescaleDB: historical storage [FROZEN]
- Site Mapper: future historical consumer [OUT OF SCOPE v0.1]

## 2. Capacity
- 3 BFDB
- 96 circuits per BFDB
- 4 electrical variables per circuit
- 1,152 FLOAT32 telemetry values
- 768 telemetry registers per Unit ID
- 2,304 telemetry registers across Units 1/2/3

## 3. Network
- Production TCP port: 502 [PROPOSED]
- Lab TCP port: 1502 [FROZEN FOR POC]
- Unit IDs: 1 / 2 / 3 [PROPOSED]
- Gateway production IP: TBD

## 4. Modbus
- FC04 Input Registers [TBD METASYS]
- IEEE-754 FLOAT32 [PROPOSED]
- 2 registers/value [FROZEN DESIGN]
- Big-endian bytes [TBD METASYS]
- High word first [TBD METASYS]

## 5. Engineering units
- Voltage: V
- Current: A
- Power: W
- Energy: kWh

## 6. Register map
For circuit c in 1..96:
```text
base=(c-1)*8
base+0..1 Voltage
base+2..3 Current
base+4..5 Power
base+6..7 Energy
```

Quality register = `896 + (c-1)`.

## 7. Quality
MISSING / PARTIAL / GOOD / STALE / INVALID are represented through per-circuit quality bits. Numeric last-known values are retained during staleness.

## 8. Polling
- Interval: TBD
- Timeout: TBD
- Retries: TBD

## 9. MQTT upstream
Observed topic family: `data/dev/<serial>`.

The real serial-to-BFDB and raw-point-to-circuit mapping is TBD and must be evidence-backed.

## 10. Commissioning sequence
1. verify RAW MQTT;
2. verify physical identity mapping;
3. verify one known FLOAT32 test value;
4. confirm FC03/FC04;
5. confirm byte/word order;
6. confirm Unit IDs;
7. compare MQTT, TSDB and Modbus values;
8. simulate stale source;
9. approve polling/timeout policy.
