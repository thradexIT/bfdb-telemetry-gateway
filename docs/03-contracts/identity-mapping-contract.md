# Identity Mapping Contract

## Corrected emulator rule

The emulator no longer uses a flat identity such as:

```text
0_1_1 ... 0_1_96
```

That shape is inconsistent with the reviewed panel topology in which one panel/meter has 24 positions.

The corrected synthetic emulator mapping is:

```text
Circuit  1..24  -> 0_1_1 .. 0_1_24
Circuit 25..48  -> 0_2_1 .. 0_2_24
Circuit 49..72  -> 0_3_1 .. 0_3_24
Circuit 73..96  -> 0_4_1 .. 0_4_24
```

Formula:

```text
panelIndex = floor((circuitId - 1) / 24) + 1
position   = ((circuitId - 1) mod 24) + 1

rawPointId = 0_<panelIndex>_<position>
```

The resolver performs the inverse:

```text
circuitId = ((panelIndex - 1) * 24) + position
```

## Invariants

For the current 96-circuit emulator profile:

- `panelIndex` must be in `1..4`;
- `position` must be in `1..24`;
- `circuitId` must be in `1..96`;
- `0_1_25` is rejected;
- `0_1_96` is rejected;
- `0_5_1` is rejected.

## Synthetic vs physical truth

The emulator uses a synthetic logical order:

```text
1 -> A1
2 -> A2
3 -> B1
4 -> B2
```

only to cover the current 96-circuit PoC topology.

This **does not prove** that real field MQTT will name frame-B meters as `0_3_*` and `0_4_*`.

The reviewed evidence supports with high confidence that the **third component is bounded by the per-panel position count**, but the real gateway namespace/group mapping for frame B remains TBD.

Production identity must therefore remain explicit, evidence-backed configuration. The emulator mapping must never silently become field truth.
