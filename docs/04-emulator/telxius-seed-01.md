# Telxius seed-01 — evidence-driven hardware emulation

**Status:** laboratory profile. It emulates the available Telxius field evidence without claiming commissioning truth that the evidence does not prove.

## Purpose

This profile exists so Site Mapper can consume the same protocol shapes it will later consume from real field devices.

```text
Acrel/AWT evidence -> MQTT emulator ----\
                                         > Site Mapper -> Latest/History/UI/Modbus
Smartpack2 evidence -> SNMPv2c emulator -/
```

BFDB owns the **hardware emulation boundary**. In the unified laboratory, Site Mapper owns normalization, bindings, persistence, operational UI and Modbus/Metasys projection.

The Telxius overlay intentionally does **not** replace the historical `EMU-BFDB-01..03` profile, the default BFDB gateway, TimescaleDB or Modbus map.

## Evidence boundary

The profile is derived from the supplied:

- QDF equipment/breaker inventory;
- Acrel/AWT inventory;
- captured MQTT messages;
- Smartpack2 Touch SNMP walk;
- Eltek eNexus PowerSystem rev54 MIB.

Known evidence and laboratory assumptions are kept separate.

### MQTT identity

The wire identity is:

```text
source equipment = MQTT topic serial / payload sn
point            = reported rawPointId
identity         = SN + rawPointId
```

Example wire family:

```text
data/dev/<sn>

reported:
  0_1_1
  0_1_2
  ...
```

The emulator preserves the observed payload fields:

```text
msgid
method
sn
timestamp
sendtime
version
reported
```

and, for measured points:

```text
state
U1 U2
I1 I2
P1 P2
EP1 EP2
```

A state-only point is emitted as:

```json
{"state":"ONLINE"}
```

Missing measurements are never converted into fabricated numeric zeroes by the state-only path.

## Captured MQTT publication shape

The Telxius profile uses:

- 10 s publication interval;
- one 24-position raw group per cycle/source;
- message chunks of 10 + 10 + 4 positions;
- QoS 1;
- retain=false.

This mirrors the captured message shape more closely than the historical generic 24-point batch.

The electrical generator is still synthetic. The current profile uses **12.23 V** as its MQTT nominal baseline because that value is present in the captured Acrel/AWT-shaped sample. This is not a claim that every field channel is fixed at 12.23 V.

The Smartpack2 nominal system voltage of **48 V belongs to SNMP evidence** and must not be copied into the Acrel MQTT model.

## QDF inventory represented

### QDF-2

Inventory breaker count: **26**.

Current physical inventory positions represented:

```text
A1: P01 P02 P03 P04
A2: P01 P02 P03 P06 P07 P08 P14 P15 P16
B1: P01 P02 P03 P04
B2: P01 P02 P03 P06 P07 P08 P14 P15 P16
```

### QDF-4

Inventory breaker count: **12**.

```text
A3: P01..P06
B3: P01..P06
```

### QDF-5

Inventory breaker count: **36**.

```text
A3: P01..P18
B3: P01..P18
```

The raw group numbers used by the emulator remain a **laboratory transport mapping**. The Acrel RTU slave addresses documented in the equipment inventory do **not** prove the real MQTT group number. Never infer `slave 1 => 0_1_*` (or equivalent) as field truth without direct evidence.

The profile records the observed equipment inventory separately:

```text
gateway: AWT100-CEHW
meter:   AMC16Z-FDK24
A3 slave 1
A2 slave 3
B3 slave 5
B2 slave 7
```

## Serial-number substitution

Tracked configuration uses laboratory identities:

```text
EMU-TELXIUS-QDF-2
EMU-TELXIUS-QDF-4
EMU-TELXIUS-QDF-5
```

A known field serial can be substituted without editing committed files:

```dotenv
TELXIUS_QDF_2_SN=<serial>
TELXIUS_QDF_4_SN=<serial>
TELXIUS_QDF_5_SN=<serial>
```

Only set a serial after the physical QDF association is evidenced. A captured serial is not automatically assigned to a QDF merely because it is available.

## U1/U2 boundary

The current normalizer contract uses:

```text
U1  -> voltage
I1  -> current
P1  -> power
EP1 -> energy
```

The Telxius emulator preserves `U2/I2/P2/EP2` in the MQTT wire payload as `0.00`, matching the supplied sample.

Their physical meaning is not promoted into a second breaker/channel model until field evidence or manufacturer documentation proves the semantics. No hidden U2-to-breaker inference is performed.

## Smartpack2 Touch SNMPv2c profile

The Telxius Smartpack2 agent is read-only and uses the known **Eltek enterprise tree** instead of a fabricated Telxius private subtree.

Observed scalars represented include:

```text
powerSystemStatus
powerSystemType
powerSystemMode
powerSystemCompany
powerSystemSite
powerSystemModel
powerSystemSerialNumber
powerSystemNominalVoltage
loadCurrentStatus
loadCurrentValue
loadFusesStatus
loadNumberOfGroups
batteryVoltageValue
```

It also exposes the observed load-group table and the six programmable fuse-alarm inputs:

```text
A3 Fuse alarm
B3 Fuse Alarm
A2 Fuse Alarm
B2 Fuse Alarm
A1 Fuse Alarm
B1 Fuse Alarm
```

The agent defaults to **SNMPv2c**, matching the supplied walk workflow, but can be switched to SNMPv3 for laboratory use.

The real Smartpack2 serial is never committed. Use:

```dotenv
TELXIUS_SMARTPACK2_SN=<serial>
```

## Run the opt-in Telxius hardware lab

Create a locally ignored environment file. Do not commit credentials.

Example:

```dotenv
TELXIUS_SNMP_VERSION=2c
TELXIUS_SNMP_COMMUNITY=<private-readonly-lab-community>

# Optional only after each physical association is known:
# TELXIUS_QDF_2_SN=<serial>
# TELXIUS_QDF_4_SN=<serial>
# TELXIUS_QDF_5_SN=<serial>
# TELXIUS_SMARTPACK2_SN=<serial>
```

Start the broker and hardware emulators:

```bash
docker compose --env-file .env.telxius \
  -f docker-compose.yml \
  -f docker-compose.telxius-seed-01.yml \
  --profile telxius \
  up -d --build mosquitto telxius-field-emulator telxius-smartpack2
```

Observe MQTT independently:

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 -t 'data/dev/#' -v
```

Query the Smartpack2 laboratory agent from localhost:

```bash
snmpwalk -v2c -c '<private-readonly-lab-community>' \
  -On udp:127.0.0.1:11621 1.3.6.1.4.1.12148.10
```

The UDP port is published on loopback only.

## Site Mapper substitution contract

Site Mapper should resolve:

```text
SN -> QDF/source equipment
SN + rawPointId -> breaker/point
```

No per-message manual assignment is required once source and point bindings are commissioned.

The laboratory boundary is deliberately substitutable:

```text
today:
  BFDB MQTT emulator + BFDB SNMP emulator -> Site Mapper

field:
  real AWT/Acrel MQTT + real Smartpack2 SNMP -> Site Mapper
```

Replacing emulation with field sources must not require an architectural redesign of Site Mapper.

## Explicit non-claims

This laboratory profile does not claim that:

- MQTT raw group numbers are proven physical panel identities;
- Acrel RTU slave addresses equal MQTT raw group indexes;
- U2/I2/P2/EP2 are understood as independent breaker channels;
- the captured serial belongs to a specific QDF unless that association is separately evidenced;
- synthetic electrical values are field measurements;
- laboratory success is field commissioning;
- the existing Modbus Unit-ID/register map has been commissioned for these QDFs.

Those decisions remain evidence/commissioning gates.
