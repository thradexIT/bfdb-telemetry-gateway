# Project Charter — BFDB Telemetry Gateway

Status: ACTIVE / PoC v0.1

## Purpose
Convert telemetry arriving over MQTT from three BFDB domains into:
1. deterministic current state;
2. historical time-series storage;
3. a read-only Modbus TCP interface consumable by Johnson Controls Metasys.

## Scale
- 3 BFDB
- 96 circuits per BFDB
- Voltage, Current, Power, Energy per circuit
- 288 circuits
- 1,152 telemetry values

## Consumers
- MQTT Explorer — RAW verification
- Metasys — Modbus TCP
- Site Mapper — future historical consumer

## Out of scope v0.1
- Site Mapper UI changes
- write/control commands
- breaker actuation
- claiming an unverified physical 96-circuit MQTT identity map
