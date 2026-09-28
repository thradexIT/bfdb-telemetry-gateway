# Release Validation Receipt

Status: **CANONICAL TEMPLATE**

Use one copy of this receipt for every release candidate, field test, or production promotion.

## Release identity

```text
Release name:
Git commit:
Git tag:
Branch:
PR:
Build date:
Validator:
Environment:
```

## Automated verification

```text
CI run:
CI result:
Integration Smoke run:
Integration Smoke result:
Unit test count/result:
Known warnings:
```

## Architecture invariants

```text
[ ] MQTT is asynchronous upstream source
[ ] Latest State is current-state owner
[ ] TimescaleDB is historical projection
[ ] Modbus does not synchronously query MQTT
[ ] Modbus does not synchronously query TimescaleDB
[ ] Modbus is read-only
```

## MQTT validation

```text
Broker:
Topic:
Observed serials:
Reviewer identity used:
RAW subscriber:
External MQTT Explorer test:
Result:
```

## Identity validation

```text
Profile:
Expected panels/groups:
Positions per panel:
Known physical mapping:
Synthetic mapping still present?:
Invalid-id regression result:
```

For emulator profile confirm:

```text
[ ] no 0_1_25
[ ] no 0_1_49
[ ] no 0_1_96
[ ] 0_1_1..24 present
[ ] 0_2_1..24 present
[ ] 0_3_1..24 present where synthetic profile applies
[ ] 0_4_1..24 present where synthetic profile applies
```

## Timescale validation

```text
Rows present:
BFDB-01:
BFDB-02:
BFDB-03:
Latest observed_at:
Historical semantic caveats:
Result:
```

## Modbus validation

```text
Host:
Port:
FC:
Word order:
Byte order:
Unit 1 result:
Unit 2 result:
Unit 3 result:
Known circuit/value:
Result:
```

## Partial/stale behavior

```text
Partial patch tested:
Explicit zero tested:
Stale tested:
Offline tested:
Reconnect tested:
Result:
```

## Remote review

```text
Method:
Temporary endpoint:
Reviewer username:
Password rotated after test:
External client result:
```

Never store the actual password in the receipt.

## Hardware / commissioning

```text
Real AMC/AWT connected:
Serial mapping verified:
Known physical circuit traced:
Metasys connected:
Metasys acceptance record:
```

## Production controls

```text
Security review:
TLS:
Secrets:
Monitoring:
Alerting:
Backup:
Restore test:
Rollback test:
```

## Open deviations

```text
1.
2.
3.
```

## Decision

```text
[ ] LAB PASS
[ ] FIELD TEST PASS
[ ] RELEASE CANDIDATE PASS
[ ] PRODUCTION PROMOTION APPROVED
[ ] BLOCKED
```

Approver:

Date:
