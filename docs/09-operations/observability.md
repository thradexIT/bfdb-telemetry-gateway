# Observability

## Implemented v0.1 log markers

The current implementation emits recognizable operational markers:

- `EMULATOR_READY`
- `MQTT_TX`
- `GATEWAY_READY`
- `MQTT_CONNECTED`
- `MQTT_DISCONNECTED`
- `MQTT_RX`
- `TSDB_CONNECTED`
- `MODBUS_LISTEN`
- `DECODE_ERROR`
- `GATEWAY_ERROR`
- `MQTT_QUEUE_FULL`

Representative healthy flow:

```text
EMULATOR_READY
MQTT_TX topic=data/dev/EMU-BFDB-01 ...
MQTT_CONNECTED
GATEWAY_READY
MQTT_RX topic=data/dev/EMU-BFDB-01 ...
TSDB_CONNECTED
MODBUS_LISTEN
```

## What can currently be observed

From Docker logs:

- emulator publication continuity;
- broker/gateway connectivity;
- topic/msgid flow;
- decode failures;
- generic gateway failures;
- queue overflow;
- Modbus server startup;
- TSDB connection establishment.

From direct probes:

- MQTT via MQTT Explorer or `mosquitto_sub`;
- TSDB via SQL;
- Modbus via `tools/modbus-reader/read.py`.

## Not yet implemented

Do not claim these exist in v0.1:

- HTTP `/health`;
- Prometheus/metrics endpoint;
- production dashboards;
- alerting rules;
- durable event replay metrics;
- per-BFDB freshness metrics endpoint.

## Next hardening target

Expose machine-readable health/metrics for:

- broker connected state;
- database connected state;
- last MQTT message age;
- queue depth;
- last successful TSDB write;
- per-BFDB/per-circuit freshness;
- Modbus listener state;
- decode/error counters.

Structured JSON logs should replace the current lightweight marker format for production.
