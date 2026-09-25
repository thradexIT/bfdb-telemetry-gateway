# Modbus FLOAT32 Encoding

Each telemetry value uses two 16-bit registers.

PoC baseline:
```text
FLOAT32 -> big-endian bytes -> high 16-bit word first
```

The codec is centralized in `apps/telemetry-gateway/modbus/registers.py`.

Commissioning must validate a known value such as 12.23 end-to-end before production freeze. A word or byte swap must be made in the codec/configuration layer, not in canonical telemetry or TSDB storage.
