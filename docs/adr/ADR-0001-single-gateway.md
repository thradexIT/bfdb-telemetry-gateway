# ADR-0001 — Single logical gateway

Status: Accepted

Decision: one logical gateway ingests all configured BFDB MQTT topics and exposes one Modbus TCP endpoint.

Rationale:
- one deployment;
- shared state/quality semantics;
- no premature microservice split;
- clean internal module boundaries allow later extraction only if evidence requires it.
