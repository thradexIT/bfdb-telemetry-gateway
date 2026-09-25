# Documentation Index

This directory is the source of truth for BFDB Telemetry Gateway architecture, contracts, evidence, testing, commissioning, and operations.

## Recommended reading order

1. [Project Charter](00-project/PROJECT-CHARTER.md)
2. [Project Status](00-project/STATUS.md)
3. [System Overview](02-architecture/system-overview.md)
4. [MQTT Wire Contract](03-contracts/mqtt-wire-contract.md)
5. [Partial Update Contract](03-contracts/partial-update-contract.md)
6. [Canonical Telemetry Contract](03-contracts/canonical-telemetry-contract.md)
7. [Timeseries Ingestion Policy](05-timeseries/ingestion-policy.md)
8. [ICD — Gateway ↔ Metasys](ICD.md)
9. [Test Strategy](07-testing/test-strategy.md)
10. [Lab Runbook](08-commissioning/lab-runbook.md)
11. [Remote MQTT Access](08-commissioning/remote-mqtt-access.md)
12. [Lab Evidence 2026-09-25](01-evidence/lab-validation-2026-09-25.md)

## Directory map

### 00-project

Project boundaries and decision context:

- charter;
- scope;
- status;
- assumptions;
- risks;
- open questions;
- glossary.

### 01-evidence

Direct observations and repeatable lab proof. Evidence should distinguish **observed** behavior from architecture **decisions**.

### 02-architecture

System topology, dataflow, state ownership, and component responsibilities.

### 03-contracts

Wire and semantic contracts that implementation must preserve:

- MQTT topic/payload;
- identity resolution;
- canonical telemetry;
- partial updates;
- quality;
- timestamps.

### 04-emulator

How the synthetic field source behaves and where emulator fidelity ends.

### 05-timeseries

Historical storage model, ingestion semantics, Site Mapper read model, and retention.

### 06-modbus

Addressing, FLOAT32 encoding, quality registers, and the register contract.

### 07-testing

Unit, integration, E2E, performance, traceability, and RAW MQTT certification.

### 08-commissioning

Lab startup, MQTT Explorer, external remote review, and eventual Metasys commissioning.

### 09-operations

Configuration, security, observability, troubleshooting, and recovery.

### adr

Architecture Decision Records.

## Status vocabulary

| Label | Meaning |
|---|---|
| VERIFIED | Backed by specification/manual or repeatable verified system behavior |
| OBSERVED | Directly seen in captures, logs, MQTT, database, or lab execution |
| DECISION | Architecture/product decision |
| INFERENCE | Reasonable interpretation that still needs evidence |
| TBD | Requires field evidence or integrator confirmation |

A document must not silently promote OBSERVED, INFERENCE, or DECISION into VERIFIED fact.

## Important project boundaries

- Site Mapper UI is not modified in PoC v0.1.
- Modbus is a projection of Latest State, never a synchronous query of MQTT or TimescaleDB.
- Real physical MQTT identity mapping is not yet proven.
- The emulator mapping is synthetic.
- Remote-access tooling is a commissioning convenience, not production infrastructure.
