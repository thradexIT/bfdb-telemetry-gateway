# MQTT Explorer Runbook

Connect directly to the broker, not to the telemetry gateway.

Lab settings:
- Host: machine running Docker
- Port: 1883
- TLS: off
- Username/password: none for lab only

Expected tree:
```text
data
└── dev
    ├── EMU-BFDB-01
    ├── EMU-BFDB-02
    └── EMU-BFDB-03
```

Inspect the exact JSON payload under each topic. This verifies the RAW path independently of normalization, TSDB and Modbus.
