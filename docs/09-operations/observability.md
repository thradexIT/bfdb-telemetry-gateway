# Observability

v0.1 emits structured log markers:
- EMULATOR_READY
- MQTT_TX
- GATEWAY_READY
- MQTT_CONNECTED / MQTT_DISCONNECTED
- MQTT_RX
- TSDB_CONNECTED
- MODBUS_LISTEN
- DECODE_ERROR
- GATEWAY_ERROR
- MQTT_QUEUE_FULL

Next hardening step: expose health and metrics endpoints for broker state, DB state, last-message age, queue depth and per-BFDB freshness.
