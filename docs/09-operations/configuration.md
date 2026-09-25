# Configuration

Configuration is externalized under `config/` and environment variables.

Primary files:
- `devices.yaml`: logical BFDB, serial, Unit ID and identity rules.
- `emulator.yaml`: synthetic electrical and publishing behavior.
- `modbus-map.yaml`: Modbus map/encoding baseline.
- `quality.yaml`: freshness and quality bits.

Environment variables override runtime endpoints and credentials.

Production configuration must not embed secrets in Git.
