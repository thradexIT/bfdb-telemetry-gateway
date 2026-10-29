# Telxius seed-01 — evidence-driven hardware emulation

**Status:** laboratory profile. It reproduces the available Telxius protocol evidence without promoting laboratory mappings or inferred ASN.1 types to field truth.

## Purpose

BFDB owns the **hardware-emulation boundary** only.

```text
Acrel/AWT evidence  -> MQTT emulator ---------> existing MQTT broker -> Site Mapper
Smartpack2 evidence -> SNMP snapshot emulator ------------------------> Site Mapper
```

The operational MQTT broker is **not owned by BFDB**. The Telxius overlay publishes to the broker configured through `MQTT_HOST/MQTT_PORT`. The historical Mosquitto service remains useful for isolated BFDB/CI labs, but it is not the architectural production broker.

Site Mapper remains owner of source/point bindings, normalized telemetry, history, UI and its own Modbus/Metasys projection.

The Telxius overlay does not replace the historical `EMU-BFDB-01..03` profile or the default BFDB gateway/Modbus lab.

## Evidence boundary

The profile is derived from privately supplied QDF/Acrel inventory, captured MQTT messages, a Smartpack2 Touch SNMPWalk and Eltek eNexus PowerSystem rev54 MIB files.

Customer raw evidence and vendor MIB files are **runtime inputs**. They are not committed to this public repository.

---

## MQTT — complete laboratory scan

The identity contract remains:

```text
source equipment = MQTT topic serial / payload sn
point            = reported rawPointId
identity         = SN + rawPointId
```

Measured points preserve `state`, `U1/U2`, `I1/I2`, `P1/P2` and `EP1/EP2`. A documented raw position without a measured channel is emitted as `{"state":"ONLINE"}` only. Missing measurement fields are not converted into fabricated zero readings.

### Publication shape

Captured field traffic demonstrated 24-position groups split as 10 + 10 + 4. The Telxius **completeness lab mode** now publishes every raw group in that shape:

```text
QDF source
  group 1 -> 10 + 10 + 4
  group 2 -> 10 + 10 + 4
  group 3 -> 10 + 10 + 4
  group 4 -> 10 + 10 + 4
  wait `10 s
  repeat
```

That is **12 MQTT messages per QDF per lab cycle**, covering all 96 raw addresses. This differs deliberately from the earlier rotating-panel lab mode so Site Mapper can observe the complete configured raw address space on every cycle.

**Non-claim:** the capture proves the 10 + 10 + 4 packet shape, but it does not prove that real field firmware publishes all four raw groups every ten seconds. Full-scan cadence is a laboratory completeness policy.

| QDF | Documented measured positions | Raw addresses emitted |
|---|---:|---:|
| QDF-2 | 26 | 96 |
| QDF-4 | 12 | 96 |
| QDF-5 | 36 | 96 |
| **Total** | **74** | **288** |

Unmeasured raw addresses remain visible as state-only points; holes are preserved and never renumbered.

The lab raw group labels remain uncommissioned transport metadata. The equipment inventory separately records AWT100-CEHW, AMC16Z-FDK24 and RTU slaves A3=1, A2=3, B3=5, B2=7. There is no evidence proving `RTU slave number == MQTT raw group number`.

The MQTT electrical generator remains synthetic. `12.23 V` is the present baseline because it appears in the supplied Acrel/AWT-shaped capture. Smartpack2's nominal `48 V` belongs to the SNMP/system evidence.

Tracked source aliases remain `EMU-TELXIUS-QDF-2`, `EMU-TELXIUS-QDF-4` and `EMU-TELXIUS-QDF-5`. Field serials can be injected at runtime only after their QDF association is established.

---

## Smartpack2 — complete evidence snapshot

The previous built-in Smartpack2 agent exposes a small verified subset and remains available as `telxius-smartpack2-subset` for fallback/debug use.

The primary `telxius-smartpack2` service now builds a **full private snapshot at runtime** from:

```text
walk.txt
+
EltekEnexusPowersystem-rev54.mib
+
EltekEnexusPowersystem_branch10_rev54.mib
```

The supplied evidence contains **5,407 SNMP objects**. Against the supplied rev54 MIBs, the compiler resolves:

```text
5,407 total observed objects
├── 2,962 symbolic walk objects -> numeric OIDs resolved from the supplied MIBs
└── 2,445 objects already numeric in the supplied walk
```

No symbolic object is silently dropped. The compiler fails closed on an unresolved symbolic object or duplicate resolved OID.

### ASN.1 truth boundary

For the 2,962 symbolic objects, MIB syntax drives replay typing.

For the 2,445 entries already printed as numeric OIDs, the supplied walk does not carry original ASN.1 type metadata. Their replay type is therefore inferred conservatively from the displayed value.

The generated `manifest.json` records object count, symbolic/numeric counts, inferred-type count, unresolved count, textual-convention count and SHA-256 hashes of the private evidence files.

Therefore the full snapshot reproduces the observed OIDs and displayed values, but **is not claimed to be byte-for-byte BER-identical for every physical-controller response**.

### GET / GETNEXT / WALK

The private snapshot is compiled into `.snmprec` and served read-only:

```text
private SNMPWalk + private MIBs
              |
              v
       snapshot compiler
              |
       +------+------+
       |             |
       v             v
 snapshot.json    *.snmprec
                      |
                      v
             GET / GETNEXT / WALK
```

Default host exposure is `udp/127.0.0.1:11621`.

### Complete delivery into Site Mapper

There are two separate SNMP needs:

1. a realistic GET/GETNEXT/WALK surface;
2. complete Site Mapper ingestion of every captured OID/value.

Site Mapper's narrow legacy feed poller is intentionally bounded; BFDB does **not** pretend it can poll an arbitrary 5,407-object controller snapshot.

For complete laboratory ingestion, BFDB reuses the already-established notification transport and sends the generated snapshot in bounded INFORM batches:

```text
5,407-point private snapshot
          |
          | 16 varbinds/PDU by default
          v
SNMP INFORM sender
          |
          v
Site Mapper industrial SNMP receiver
          |
          v
RAW / normalized industrial signal path
```

Payload OIDs and values come from the evidence snapshot. The notification OID remains explicitly private/laboratory. This does **not** claim the physical Smartpack2 emits a 5,407-point INFORM sweep.

The sender repeats every 60 seconds by default for an active lab stream. That cadence is configurable and is not presented as field behavior.

---

## Private evidence preparation

Create an ignored local directory:

```text
.private-evidence/telxius-smartpack2/
├── walk.txt
├── EltekEnexusPowersystem-rev54.mib
└── EltekEnexusPowersystem_branch10_rev54.mib
```

Example environment:

```dotenv
MQTT_HOST=<existing-broker-host>
MQTT_PORT=1883
MQTT_USERNAME=<if-required>
MQTT_PASSWORD=<if-required>

TELXIUS_SNMP_EVIDENCE_DIR=./.private-evidence/telxius-smartpack2
TELXIUS_SNMP_COMMUNITY=<private-readonly-lab-community>

# Optional only after physical association is known
# TELXIUS_QDF_2_SN=<serial>
# TELXIUS_QDF_4_SN=<serial>
# TELXIUS_QDF_5_SN=<serial>

# Optional private replay substitution
# TELXIUS_SMARTPACK2_SN_OVERRIDE=<approved-lab-or-field-serial>
```

No credentials or customer evidence belong in Git.

## Start MQTT + full Smartpack2 replay

```bash
docker compose --env-file .env.telxius \
  -f docker-compose.telxius-seed-01.yml \
  --profile telxius \
  up -d --build telxius-field-emulator telxius-smartpack2
```

BFDB publishes to the configured existing MQTT broker. It does not start or own a broker in this Telxius overlay.

Query the full snapshot:

```bash
snmpwalk -v2c -c '<private-readonly-lab-community>' \
  -On udp:127.0.0.1:11621 1.3.6.1.4.1.12148.10
```

Generated private runtime artifacts are:

```text
/runtime/manifest.json
/runtime/snapshot.json
/runtime/data/<community>.snmprec
```

## Optional complete push into Site Mapper

Configure the Site Mapper industrial SNMP receiver endpoint and credentials it already authorizes:

```dotenv
TELXIUS_SMARTPACK2_SOURCE_ID=EMU-SMARTPACK2-LURIN
TELXIUS_SITE_MAPPER_SNMP_HOST=<reachable-receiver>
TELXIUS_SITE_MAPPER_SNMP_PORT=1162
TELXIUS_SITE_MAPPER_SNMP_VERSION=3
TELXIUS_SITE_MAPPER_SNMP_V3_USERNAME=<lab-user>
TELXIUS_SITE_MAPPER_SNMP_V3_AUTH_KEY=<private-auth-key>
TELXIUS_SITE_MAPPER_SNMP_V3_PRIV_KEY=<private-priv-key>
TELXIUS_SITE_MAPPER_SNMP_INFORM=true
TELXIUS_SNMP_REPEAT_SECONDS=60
```

Then:

```bash
docker compose --env-file .env.telxius \
  -f docker-compose.telxius-seed-01.yml \
  --profile telxius \
  --profile telxius-site-mapper \
  up -d --build \
  telxius-field-emulator \
  telxius-smartpack2 \
  telxius-smartpack2-to-site-mapper
```

The receiver must be network-reachable from the BFDB container. BFDB does not guess or open a Site Mapper endpoint.

---

## Site Mapper substitution contract

MQTT:

```text
SN -> QDF/source equipment
SN + rawPointId -> breaker/point
```

SNMP:

```text
configured Smartpack2 source identity + numeric OID -> industrial signal
```

Replacing emulation with field devices should change source endpoint/credentials/identity configuration, not require a Site Mapper architectural rewrite.

## Explicit non-claims

This profile does not claim that:

- MQTT raw group numbers are commissioned physical panel identities;
- Acrel RTU slave addresses equal MQTT raw group indexes;
- real AWT firmware publishes all four groups every ten seconds;
- `U2/I2/P2/EP2` are independent breaker channels;
- synthetic MQTT electrical values are field measurements;
- all 2,445 originally numeric SNMP OIDs have manufacturer-verified ASN.1 types;
- textual-convention replay is byte-identical to the physical controller;
- the physical Smartpack2 sends the full 5,407-point snapshot as an INFORM;
- Smartpack2 provides individual telemetry for the 74 Acrel breakers;
- a captured serial belongs to a particular QDF unless separately evidenced;
- the existing Modbus map is commissioned for QDF-2/4/5;
- laboratory success is field commissioning.
