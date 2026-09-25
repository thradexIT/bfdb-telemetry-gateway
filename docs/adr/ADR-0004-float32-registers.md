# ADR-0004 — FLOAT32 telemetry

Status: Proposed / commissioning confirmation required

Each V/I/P/E value uses IEEE-754 FLOAT32 across two 16-bit registers.

PoC baseline: big-endian bytes, high word first.

Encoding is centralized so commissioning-driven swaps do not affect canonical telemetry or TSDB storage.
