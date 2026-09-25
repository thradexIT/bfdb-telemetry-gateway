# Risks

- Incorrect physical identity mapping: high impact; mitigate with explicit configuration and field evidence.
- Partial MQTT update treated as zero: high impact; mitigate with per-field merge tests.
- Modbus byte/word mismatch: medium impact; mitigate with centralized codec and commissioning vectors.
- Restart presenting zeros as valid: high impact; mitigate by starting quality as MISSING until fresh telemetry.
- Duplicate delivery: mitigate with idempotent Latest State and TSDB dedupe key.
- Source clock errors: preserve received_at and verify field time.
