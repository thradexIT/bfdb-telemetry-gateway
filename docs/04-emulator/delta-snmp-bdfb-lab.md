# Delta/Eltek SNMP feed lab — BFDB emulator → Site Mapper

**Status:** simulated transport + synthetic electrical input-feed values. **NOT** certified Delta hardware or an Eltek MIB implementation.

## Why this is separate from the Acrel/AWT emulator

The existing field emulator publishes 96 breaker/circuit points per BFDB, nominal 12–15 V, over MQTT. The Delta/Eltek requirement is independent: two **incoming DC feeders** per BFDB, around −53 V observed, whose upstream current is queried using SNMP.

The SNMP emulator **does not sum the 12–15 V circuit currents into −53 V feeder amperes**. No DC/DC conversion efficiency or verified field relationship has been provided. The two independent load profiles are an explicitly synthetic stand-in until each physical feeder's OID-to-shunt wiring is confirmed.

## Architecture

```text
BFDB repo
├── Existing Acrel/AWT circuit emulator → MQTT → TimescaleDB + Modbus (unchanged)
└── New BFDB-01/02/03 SNMPv3 agents (read-only, simulated −53V feeds)
      ├── Feed A: CURRENT scalar and VOLTAGE scalar
      └── Feed B: CURRENT scalar and VOLTAGE scalar
             |
             | UDP SNMPv3 GET (SHA/AES authPriv)
             v
AppM-Site-Mapper / infra/snmp-collector (existing)
             |
             | normalized HTTP POST, bearer token
             v
AppM-Site-Mapper /api/telemetry/snmp/ingest
             └── commissioned POWER INPUT AccessPorts → summary/history/UI
```

Three independent agents (one per emulated BFDB) are exposed on **loopback UDP** ports:

| BFDB | Source identity | Localhost SNMP port | Feed A current OID | Feed B current OID |
| --- | --- | --- | --- | --- |
| BFDB-01 | EMU-DELTA-BFDB-01 | 11611 | 1.3.6.1.4.1.8072.9999.2026.48.1.1.0 | 1.3.6.1.4.1.8072.9999.2026.48.1.2.0 |
| BFDB-02 | EMU-DELTA-BFDB-02 | 11612 | same, different agent IP/port | same |
| BFDB-03 | EMU-DELTA-BFDB-03 | 11613 | same, different agent IP/port | same |

Voltages use `1.3.6.1.4.1.8072.9999.2026.48.2.1.0` (A) and `...48.2.2.0` (B).

**All OIDs are a reserved LAB EXAMPLE PROFILE**, **not** a claim that any Delta/Eltek controller uses them. Both metrics are SNMP `Integer` with **engineering scale 0.1**: raw `2200` means `220.0 A`, raw `-535` means `-53.5 V`. Agent identity + OID + metric uniquely identifies a binding. Real vendor MIB versions, table indices, scaling and feed mapping remain field dependencies.

## Run the SNMP lab (opt-in)

Create a locally ignored `.env.snmp` with distinct lab-only passphrases:

```dotenv
SNMP_V3_USERNAME=lab_readonly
SNMP_V3_AUTH_KEY=<choose-strong-local-auth-passphrase>
SNMP_V3_PRIV_KEY=<choose-distinct-strong-local-priv-passphrase>
SNMP_EMULATOR_SCENARIO=NORMAL
SNMP_AGENT_UPDATE_MS=1000
```

DO NOT commit credential values. Run:

```bash
docker compose --env-file .env.snmp \
  -f docker-compose.yml -f docker-compose.snmp.yml \
  --profile snmp up -d --build snmp-agent-bfdb-01 snmp-agent-bfdb-02 snmp-agent-bfdb-03

docker compose --env-file .env.snmp -f docker-compose.yml -f docker-compose.snmp.yml \
  --profile snmp logs --tail=30 snmp-agent-bfdb-01
```

A host with a compatible `snmpget` can query:

```bash
snmpget -v3 -l authPriv -u lab_readonly -a SHA -A '<auth-password>' \
  -x AES -X '<privacy-password>' -On udp:127.0.0.1:11611 \
  1.3.6.1.4.1.8072.9999.2026.48.1.1.0 \
  1.3.6.1.4.1.8072.9999.2026.48.1.2.0
```

Access is read-only. The local agent supports GET/GETNEXT/GETBULK through `net-snmp`; SNMP SET is denied by access control. Avoid public port forwarding or any real Delta credentials in this lab.

## Wire BFDB-01 to the already-implemented Site Mapper collector

Site Mapper requires a canonical BDFB Device with distinct **external POWER INPUT AccessPorts** for A/B. This prerequisite cannot be inferred from the MQTT panel/position serials and must be created through Site Mapper.

As an authorized `topology:write` operator, `POST /api/telemetry/snmp/commission` once per metric for the real AccessPort ids, e.g.:

```json
{
  "deviceId": "<actual-site-mapper-bdfb-id>",
  "feedAccessPortId": "<actual-feed-A-power-input-access-port-id>",
  "sourceIdentity": "EMU-DELTA-BFDB-01",
  "oid": "1.3.6.1.4.1.8072.9999.2026.48.1.1.0",
  "metric": "CURRENT",
  "confirmPhysicalMapping": true
}
```

Repeat for feed B with `...48.1.2.0`, and for VOLTAGE if desired with `...48.2.1.0` or `...48.2.2.0`. The same canonical port can host both CURRENT and VOLTAGE bindings, but a single OID/metric cannot be assigned to two feeds.

Collector configuration for BFDB-01 (substitute the actual Site Mapper network address and keep tokens private):

```dotenv
SNMP_CONTROLLER_HOST=127.0.0.1
SNMP_CONTROLLER_PORT=11611
SNMP_CONTROLLER_ID=EMU-DELTA-BFDB-01
SNMP_V3_USERNAME=lab_readonly
SNMP_V3_AUTH_KEY=<auth-password>
SNMP_V3_PRIV_KEY=<privacy-password>
SNMP_POLL_INTERVAL_MS=30000
SNMP_FEED_POINTS_JSON=[{"oid":"1.3.6.1.4.1.8072.9999.2026.48.1.1.0","metric":"CURRENT","scale":0.1},{"oid":"1.3.6.1.4.1.8072.9999.2026.48.1.2.0","metric":"CURRENT","scale":0.1}]
SNMP_INGEST_TOKEN=<same-random-32plus-char-token-configured-on-site-mapper>
SNMP_INGEST_URL=http://127.0.0.1:3000/api/telemetry/snmp/ingest
```

If Collector is in another Docker network, **127.0.0.1 is not the emulator host**. Use a reachable container service name on a shared private Docker network and the internal port `1161`, or a permitted local gateway path. Site Mapper's Docker Compose `snmp` profile runs one Collector instance per service, so for multiple independent agents launch separate Collector instances/configurations. Never point the collector at port 161 of a production controller using these lab credentials.

`POST /api/telemetry/snmp/ingest` receives the **same normalized payload for both real and emulated SNMP**; no change is needed in the app's ingest API. `GET /api/telemetry/snmp/feeds?deviceId=...` reports COMPLETE only when all registered independent feeder readings are fresh.

## Scenarios

`SNMP_EMULATOR_SCENARIO` is set at process start and can be:
- `NORMAL`: independently varying current A/B, normal signed DC voltage.
- `ZERO_FEED_A`: measured 0 A on Feed A, while B continues.
- `HIGH_FEED_B`: Feed B holds 640 A (illustrative high load, not an alarm certification).
- `MISSING_FEED_B`: no SNMP instances for B; the Collector must not fabricate zero and Site Mapper should show PARTIAL/STALE after readings expire.

No physical supply-to-panel relationship is assumed by scenario names. The actual number of feeds and shunts can differ on real BDFB installations.

## Acceptance gates

1. `node --test` for synthetic model, scale, security, and real SNMPv3 UDP GET / read-only behavior.
2. Observe two distinct currents via `snmpget` in the BFDB lab on each device.
3. Commission A and B in Site Mapper and run its genuine SNMP Collector against BFDB-01's emulated UDP endpoint.
4. Confirm SITE MAPPER `/api/telemetry/snmp/feeds` and the BDFB inspector display the expected independent feeder readings and COMPLETE load.
5. Stop/omit one agent point and confirm STALE/PARTIAL rather than current=0 or invented breaker loads.
6. Verify existing MQTT/Timescale/Modbus workflows have no regressions.
7. Replacing emulation with Delta requires real IP, SNMPv3 credentials, MIB firmware, OID walk and feed/shunt mapping evidence. **Emulator success is not real-hardware acceptance.**

**Security note:** This read-only lab omits traps and does not provide a production-hardened SNMP agent. Keep it on loopback/private OT-lab networks, never expose to the public Internet.

## Addendum 2026-10-21 · ELTEK_BDCBB_CONFIG_4

The earlier two-feed A/B lab remains the default **GENERIC_2_FEED** profile.
It is not evidence that a customer's Delta installation has only two inputs.
Use the independent `ELTEK_BDCBB_CONFIG_4` laboratory profile to model
**four physical input shunts A1/A2/B1/B2 per BDFB**. Set in `.env.snmp`:

```dotenv
SNMP_EMULATOR_PROFILE=ELTEK_BDCBB_CONFIG_4
SNMP_EMULATOR_SCENARIO=NORMAL
```

The existing optional Compose service definitions and ports 11611/11612/11613
remain unchanged. They now expose **four CURRENT plus four VOLTAGE
SNMPv3 scalars per device** (8 independent OIDs, total 24 across three BFDBs).

| Feed identity | Side | CURRENT synthetic OID | VOLTAGE synthetic OID |
| --- | --- | --- | --- |
| A1 | A | `1.3.6.1.4.1.8072.9999.2026.49.1.1.0` | `1.3.6.1.4.1.8072.9999.2026.49.2.1.0` |
| A2 | A | `1.3.6.1.4.1.8072.9999.2026.49.1.2.0` | `1.3.6.1.4.1.8072.9999.2026.49.2.2.0` |
| B1 | B | `1.3.6.1.4.1.8072.9999.2026.49.1.3.0` | `1.3.6.1.4.1.8072.9999.2026.49.2.3.0` |
| B2 | B | `1.3.6.1.4.1.8072.9999.2026.49.1.4.0` | `1.3.6.1.4.1.8072.9999.2026.49.2.4.0` |

**Both .48 (legacy) and .49 (Configuration 4) are synthetic test OID
subtrees, not real Delta/Eltek MIB data.** Raw current and signed voltage
are in deci-units; the existing Site Mapper Collector must scale
`0.1` for CURRENT (A) and VOLTAGE (V) and bind each OID to one
canonical external BDFB input AccessPort. The manufacturer shunt's
1000 A / 60 mV is a rating, **not** another scaling factor for an
already-normalized current.

The `NORMAL`, `ZERO_FEED_A`, `HIGH_FEED_B` and `MISSING_FEED_B`
scenarios are preserved. In Configuration 4, `MISSING_A2` omits only
A2's instances (not a fabricated zero) and `HIGH_B2` reports 650 A
on B2, crossing Site Mapper's configurable calculated warning threshold
(default 640 A). Other shunts continue independently.

This enables true SNMPv3 UDP GET tests of four shunts **after Site Mapper
has inventoried and confirmed** its four real PANEL mappings and selected
the `ELTEK_BDCBB_CONFIG_4` profile. No breaker MQTT measurement is
silently summed into incoming DC current. No field controller IP,
redundancy, shunt-to-controller index or firmware support is certified
by this emulation.

Authoritative Site Mapper contracts remain in the existing
`docs/domain/contracts/v1.2/domain-contract.md`,
`docs/domain/bdfb-power.md` and
`docs/telemetry/snmp-feed-ingestion.md`; this appendix only documents
the separate BFDB lab implementation.

## Bounded adversarial UDP stress evidence · 2026-10-21

GitHub Actions [BFDB Configuration 4 isolated UDP stress](https://github.com/thradexIT/bfdb-telemetry-gateway/actions/workflows/snmp-udp-chaos.yml) tests three local-only SNMPv3 `authPriv` agents under **60 concurrently scheduled GET rounds** (20 per BFDB) querying all **8 Config4 OIDs** each; validates that the four A1/A2/B1/B2 currents remain nonnegative and voltages remain signed, that the full set of 8 OIDs does not leak across agents, and that SNMP `SET` cannot mutate a current. A separate missing-A2 scenario checks that `noSuchInstance` is not misreported as 0 A. Original SNMPv3 tests, Python unit checks and the existing MQTT/Modbus Docker integration smoke also passed.

These are bounded CI laboratory checks **not a volumetric denial-of-service exercise**. No real Delta controller, public IP, production database or site management VLAN was contacted. A passing synthetic SNMPv3 agent **does not certify** authentic Delta OIDs, shunt calibration or field cabling.

Site Mapper's separate adversarial run identified ingestion and Collector failure modes; its canonical incident report remains [Site Mapper SNMP audit](https://github.com/em3rc0dTh/AppM-Site-Mapper/blob/main/docs/security/snmp-adversarial-audit-2026-10-21.md). Acknowledged cross-replica atomic durability remains open in [Site Mapper issue #78](https://github.com/em3rc0dTh/AppM-Site-Mapper/issues/78).

## Dual-version and dual-shunt profiles (2026-10-21)

This local emulator can be configured with two **independent** selectors:

| Hardware profile | Physical independent shunts | Synthetic OID subtree |
| --- | ---: | --- |
| `ELTEK_BDCBB_CONFIG_2` (or legacy `GENERIC_2_FEED`) | 2: A serving linked panels A1+A2, B serving linked panels B1+B2 | `...2026.48` |
| `ELTEK_BDCBB_CONFIG_4` | 4: A1, A2, B1, B2 | `...2026.49` |

`SNMP_VERSION=2c` uses a **private read-only community** provided as
`SNMP_COMMUNITY`; `SNMP_VERSION=3` (the default) retains SNMPv3
SHA/AES `authPriv` keys. Either transport can query either hardware
simulation. The emulator serves continuously refreshed synthetic measurements
but does **not** send unsolicited current packets. Site Mapper's Collector
queries using periodic SNMP GET and creates time-stamped observations.

Examples for ignored `.env.snmp`:

```dotenv
SNMP_EMULATOR_PROFILE=ELTEK_BDCBB_CONFIG_2
SNMP_VERSION=2c
SNMP_COMMUNITY=<private-readonly-lab-community>
```

```dotenv
SNMP_EMULATOR_PROFILE=ELTEK_BDCBB_CONFIG_4
SNMP_VERSION=3
SNMP_V3_USERNAME=<private-username>
SNMP_V3_AUTH_KEY=<private-auth-key>
SNMP_V3_PRIV_KEY=<private-privacy-key>
```

Restart the lab through the Site Mapper launcher after a change. Do not
rely on the displayed four-shunt totals for a physical Config 2 BDFB:
the number of transmitted OIDs never proves the number of actual shunts.
SNMPv2c sends its community and measurements in cleartext; use only a
segregated, restricted management network and source ACLs. Do not use
`public`, expose these agents beyond localhost, or confuse v2c with
anonymous broadcasts. Real Delta MIB mappings remain unverified.
