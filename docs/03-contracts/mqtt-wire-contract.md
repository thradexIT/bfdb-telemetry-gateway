# MQTT Wire Contract

Observed topic family:

```text
data/dev/<serial>
```

Payload fields observed:

```text
msgid
method
sn
timestamp
sendtime
version
reported
```

## Wire rules

- topic and payload are separate;
- topic serial must match payload `sn`;
- method `update` is accepted by this ingestion path;
- `reported` must be an object;
- numeric values are parsed only when present;
- an omitted field is not synthesized;
- unknown physical identities are rejected until mapped.

## Corrected emulator point-id shape

For the panelized emulator profile:

```text
0_<panelIndex>_<position>
```

with:

```text
panelIndex = 1..4
position   = 1..24
```

Examples:

```text
0_1_1
0_1_24
0_2_1
0_2_24
0_3_1
0_3_24
0_4_1
0_4_24
```

Invalid for this profile:

```text
0_1_25
0_1_96
0_5_1
```

The 24-position limit is a **wire-shape rule for the corrected emulator** and reflects the reviewed per-panel topology.

The physical meaning of each real gateway group number remains evidence-TBD; in particular, the repository does not claim that real frame B is necessarily encoded as groups 3 and 4.

## Lab transport profile

- QoS 1;
- retain=false.

Production session/auth/TLS settings remain TBD.
