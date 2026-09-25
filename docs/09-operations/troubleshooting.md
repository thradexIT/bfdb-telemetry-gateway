# Troubleshooting

## MQTT Explorer sees no data
- verify `docker compose ps`;
- verify port 1883;
- inspect field-emulator logs;
- inspect `data/dev/#`.

## TSDB is empty
- inspect telemetry-gateway logs for DECODE_ERROR/TSDB errors;
- verify serial mapping in `config/devices.yaml`;
- query `telemetry_samples`.

## Modbus returns zero
Zero may be a real value or an uninitialized register. Inspect the corresponding quality word. Quality 0 means MISSING/not yet valid.

## Point rejected
Check Identity Resolver configuration. Production mapping is intentionally explicit rather than guessed.
