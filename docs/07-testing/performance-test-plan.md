# Performance Test Plan

Target logical scale: 3 BFDB x 96 circuits x 4 values.

Initial load profile:
- emulator updates 24 circuits per BFDB per second;
- all 96 circuits refresh over four publish cycles;
- gateway holds 288 Latest State circuit objects;
- Modbus exposes three logical units.

Future performance gate:
- exercise 1s, 5s, 10s, 30s and 60s full-cycle cadences;
- capture CPU, memory, broker throughput, DB rows/sec and Modbus latency;
- validate no queue drops;
- define production resource envelope.
