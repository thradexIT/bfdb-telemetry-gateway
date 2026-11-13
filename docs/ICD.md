# ICD — BFDB MQTT Telemetry Gateway ↔ Johnson Controls Metasys

Version: 0.2-DRAFT
Status: DRAFT

## 1. Roles
- BFDB Telemetry Gateway: Modbus TCP Server [FROZEN]
- Metasys: Modbus TCP Client [FROZEN]
- MQTT: asynchronous upstream source [FROZEN]
- TimescaleDB: historical storage [FROZEN]
- Site Mapper: future historical consumer [OUT OF SCOPE v0.2]

## 2. Capacity
- 3 BFDB
- 96 circuits per BFDB
- 4 electrical variables per circuit
- 1,152 FLOAT32 breaker telemetry values
- 768 breaker telemetry registers per Unit ID
- 2,304 breaker telemetry registers across Units 1/2/3

## 3. Network
- Production TCP port: 502 [PROPOSED]
- Lab TCP port: 1502 [FROZEN FOR POC]
- Unit IDs: 1 / 2 / 3 [PROPOSED]
- Gateway production IP: TBD

## 4. Modbus
- Read-only Modbus TCP
- IEEE-754 FLOAT32 [PROPOSED]
- 2 registers/value [FROZEN DESIGN]
- Big-endian bytes [TBD METASYS]
- High word first [TBD METASYS]

## 5. Metasys engineering units
The Modbus projection follows the client/RFP engineering units independently of the upstream transport representation.

- Voltage: V
- Current: A
- Power: kW
- Energy: kWh

Canonical internal storage remains:
- power: W (power_w)
- energy: kWh (energy_kwh)

Therefore the Modbus projection applies:

```text
power_kW = power_W / 1000
energy_kWh = energy_kWh
```

The source/latest-state values and Timescale history are not rewritten by this presentation conversion.

## 6. Register map
For circuit c in 1..96:
```text
base=(c-1)*8
base+0..1 Voltage (V)
base+2..3 Current (A)
base+4..5 Power (kW)
base+6..7 Energy (kWh)
```

Quality register = 896 + (c-1).

## 7. Quality
MISSING / PARTIAL / GOOD / STALE / INVALID are represented through per-circuit quality bits. Numeric last-known values are retained during staleness.

## 8. Polling
- Interval: TBD
- Timeout: TBD
- Retries: TBD

## 9. MQTT upstream
Observed topic family: data/dev/<serial>.

The real serial-to-BFDB and raw-point-to-circuit mapping is evidence-backed separately and must not leak into the client Modbus contract.

## 10. Commissioning sequence
1. verify RAW MQTT;
2. verify physical identity mapping;
3. verify one known FLOAT32 test value;
4. confirm function code;
5. confirm byte/word order;
6. confirm Unit IDs;
7. compare source, canonical state and Modbus values;
8. verify Power conversion W -> kW at the Modbus boundary;
9. verify Energy is exposed as kWh;
10. simulate stale source;
11. approve polling/timeout policy.
