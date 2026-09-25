# Canonical Telemetry Contract

After identity resolution each raw point becomes a canonical patch containing:
- bfdb_id
- unit_id
- circuit_id
- gateway_serial
- raw_point_id
- observed_at
- msgid
- optional state
- optional voltage
- optional current
- optional power
- optional energy

Optionality is intentional. Missing metrics remain absent and do not overwrite Latest State.
