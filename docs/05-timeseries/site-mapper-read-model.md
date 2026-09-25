# Site Mapper Read Model

Site Mapper UI is frozen for this milestone.

Future historical reads should come from the TSDB/read layer, not from Modbus and not directly from MQTT.

Expected dimensions:
- BFDB
- Circuit
- Voltage
- Current
- Power
- Energy

Expected windows:
- 24h
- 7d
- 15d
- 1M

Downsampling/continuous aggregates are intentionally deferred until real publication cadence and retention requirements are measured.
