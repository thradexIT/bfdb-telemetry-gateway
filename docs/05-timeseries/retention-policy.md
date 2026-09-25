# Retention Policy

Not frozen yet.

Reason: final policy depends on measured field cadence and Site Mapper query requirements.

Design target:
- preserve raw recent telemetry;
- use aggregate/downsampled series for longer windows;
- support 24h, 7d, 15d and 1M reads;
- separate raw retention from aggregate retention.

The first field run must measure actual rows/sec and payload cadence before setting production retention.
