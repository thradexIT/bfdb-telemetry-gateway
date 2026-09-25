# Time-Series Schema

Hypertable: `telemetry_samples`.

One row stores an accepted electrical update for one canonical circuit, including the merged snapshot and `changed_fields`.

Core columns:
- observed_at
- received_at
- bfdb_id
- gateway_serial
- circuit_id
- raw_point_id
- voltage_v
- current_a
- power_w
- energy_kwh
- state
- quality
- mqtt_msgid
- changed_fields

State-only updates change Latest State but do not create an electrical sample in v0.1.

Retention, compression and downsampling are deferred until real publication cadence is measured.
