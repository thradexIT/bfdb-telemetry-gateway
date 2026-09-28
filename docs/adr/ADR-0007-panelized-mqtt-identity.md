# ADR-0007 — Panelized MQTT Identity in the Emulator

Status: ACCEPTED

Date: 2026-09-28

## Context

The original emulator flattened 96 logical circuits into raw ids `0_1_1..0_1_96`.

The reviewed topology model says a panel/meter has 24 positions. Therefore a raw id such as `0_1_96` incorrectly makes one panel appear to contain 96 positions.

The exact real namespace used for frame B is not yet proven.

## Decision

The emulator will model 96 logical circuits as **four synthetic groups of 24 positions**:

```text
1..24  -> 0_1_1..0_1_24
25..48 -> 0_2_1..0_2_24
49..72 -> 0_3_1..0_3_24
73..96 -> 0_4_1..0_4_24
```

The gateway's emulator identity resolver performs the inverse mapping to logical circuits 1..96.

## Invariants

- final position component: 1..24;
- current emulator panel/group count: 4;
- logical circuit range: 1..96;
- `0_1_25` and `0_1_96` are invalid;
- real production mapping remains configurable and evidence-backed.

## Consequences

Positive:

- MQTT wire representation respects panel capacity;
- logical circuit and Modbus contracts remain unchanged;
- regression tests can prevent reintroduction of flat raw ids;
- partial-update behavior continues to operate on stable raw ids.

Caution:

- groups 3/4 are synthetic in the emulator;
- this ADR does not decide how real frame B is encoded;
- this ADR does not resolve U1/U2 internal-section semantics.

## Follow-up

Use real hardware tests to determine:

- frame-B namespace/grouping;
- exact raw point to physical-circuit mapping;
- U1/U2 and I1/I2/P1/P2/EP1/EP2 channel semantics.
