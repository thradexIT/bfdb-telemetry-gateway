# Test Strategy

## Unit
- electrical power coherence;
- monotonic energy;
- partial merge;
- explicit zero vs missing;
- out-of-order rejection;
- FLOAT32 encode/decode;
- register boundaries.

## Integration
- MQTT publish/subscribe;
- parser + identity resolution;
- Timescale persistence/dedupe;
- Modbus register projection.

## E2E
For the same BFDB/circuit:
1. observe RAW MQTT;
2. query corresponding TSDB row;
3. read corresponding Modbus Unit ID/registers;
4. compare V/I/P/E within FLOAT32/rounding tolerance.

Negative paths include malformed payload, duplicates, stale source, broker reconnect, restart and DB outage.
