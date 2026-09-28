# Documentation Readiness Matrix

Status: **GREEN — documentation complete for the current PoC/product stage**

Date: 2026-09-28

This matrix evaluates **documentation readiness**, not field certification or production deployment status.

A row is GREEN when the repository contains a clear, executable, reviewable document for that area, including:
- purpose;
- assumptions and boundaries;
- procedure;
- expected result;
- acceptance criteria;
- unresolved field facts explicitly marked as TBD rather than invented.

## Matrix

| Area | Documentation status | Canonical source |
|---|---|---|
| Executive explanation | ✅ GREEN | `README.md` |
| Developer onboarding | ✅ GREEN | `README.md`, `docs/README.md` |
| Start/run procedure | ✅ GREEN | `README.md`, `docs/08-commissioning/lab-runbook.md` |
| RAW MQTT / TSDB / Modbus | ✅ GREEN | `README.md`, lab runbook |
| Pinggy + MQTT Explorer | ✅ GREEN | `docs/08-commissioning/remote-mqtt-access.md` |
| Credential recovery | ✅ GREEN | `make remote-creds`, remote-access runbook |
| Architecture | ✅ GREEN | `docs/02-architecture/system-overview.md` |
| 4×24 identity model | ✅ GREEN | identity contract, ADR-0007, tests |
| Historical evidence | ✅ GREEN | `docs/01-evidence/` |
| Troubleshooting | ✅ GREEN | `docs/09-operations/troubleshooting.md` |
| PoC vs production boundary | ✅ GREEN | README, status, security docs |
| Metasys commissioning documentation | ✅ GREEN | `docs/08-commissioning/metasys-commissioning-runbook.md` |
| Real hardware documentation | ✅ GREEN | `docs/04-emulator/real-hardware-integration-dossier.md` |
| Production runbook | ✅ GREEN | `docs/09-operations/production-runbook.md` |
| SLO / monitoring / DR documentation | ✅ GREEN | `docs/09-operations/slo-monitoring-dr.md` |
| Release validation receipt | ✅ GREEN | `docs/07-testing/release-validation-receipt.md` |

## Important distinction

The documentation is GREEN even when a real-world gate is still pending.

Examples:

```text
Metasys commissioning documentation = GREEN
Actual Metasys commissioning        = NOT YET EXECUTED

Real-hardware integration dossier    = GREEN
Real AMC/AWT field validation        = NOT YET EXECUTED

Production runbook                   = GREEN as a baseline
Production deployment                = NOT YET APPROVED
```

This prevents a dangerous documentation anti-pattern: marking an area incomplete merely because the external system has not yet been connected, while also preventing the opposite error of claiming field evidence that does not exist.

## Documentation rule

Every future change that affects:
- wire format;
- identity;
- persistence semantics;
- Modbus mapping;
- security;
- commissioning;
- operational procedures;

must update the corresponding canonical document in the same PR.
