# Panelized MQTT Identity Correction — 2026-09-28

Status: **DESIGN CORRECTION / SOURCE-SUPPORTED**

## Problem found

The first emulator version represented all 96 logical circuits under one raw MQTT family:

```text
0_1_1
...
0_1_96
```

This produced values such as `0_1_96`.

The reviewed BDFB/AMC topology indicates that a panel/meter has **24 positions**, so the final component of the raw identity should not be stretched to 96 for one panel.

## Source-supported constraints

The topology review establishes the following useful constraints for the correction:

- each panel has 24 positions/circuits;
- multiple panels/meters are represented as separate logical groups;
- the third component `N` is bounded by the panel position count;
- moving beyond the first 24 positions should move to another panel/group rather than become `0_1_25`, `0_1_96`, etc.

The same review explicitly leaves the exact real naming of frame-B groups unresolved.

## Corrected emulator model

For the current 96-circuit PoC, the emulator now uses four synthetic groups of 24:

```text
Circuit  1..24  -> 0_1_1 .. 0_1_24
Circuit 25..48  -> 0_2_1 .. 0_2_24
Circuit 49..72  -> 0_3_1 .. 0_3_24
Circuit 73..96  -> 0_4_1 .. 0_4_24
```

This preserves the stable logical circuit numbers used by TimescaleDB and Modbus while correcting the MQTT wire identity.

## Resolver rule

```text
circuitId = ((panelIndex - 1) * 24) + position
```

The resolver rejects:

```text
0_1_25
0_1_96
0_5_1
0_2_0
```

for the current emulator profile.

## Important non-claim

The emulator uses groups 3 and 4 synthetically to represent the remaining 48 circuits.

This does **not** establish that the real AWT100 will encode frame B as:

```text
0_3_*
0_4_*
```

Field evidence is still required.

## U1/U2 interpretation deliberately not changed

The reviewed material contains a hypothesis that suffixes `1` and `2` may correspond to internal 12-channel sections. It also proposes a targeted physical test to distinguish possible mappings.

Because that interpretation is not yet field-proven, this change does **not** remap logical channels across U1/U2.

The correction is intentionally narrow:

> enforce the 24-position panel boundary in the raw MQTT identity without inventing unverified suffix semantics.

## Regression protection

Unit tests verify:

- boundary mappings 1, 24, 25, 48, 49, 72, 73, 96;
- 96 unique ids;
- every final position is within 1..24;
- `0_1_25` and `0_1_96` are never generated;
- the gateway resolver reconstructs the stable logical circuit number;
- invalid panel/position ids are rejected.
