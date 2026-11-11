# Telxius SmartPack2 client-parity SNMP lab

Status: **LAB HARDWARE TWIN / FIELD SUBSTITUTION TARGET**

This profile exists to prove that Site Mapper can consume the same SNMP shape from the BFDB
emulator in the lab and from the physical SmartPack2 later. Site Mapper must not contain an
emulator-only parser or topology rule.

The tracked repository contains no customer community string, password or private SNMPWalk.
The full GET/GETNEXT/WALK surface is still compiled at runtime from the private evidence directory.

## Contract

The laboratory path is:

```text
telxius-smartpack2
  |-- GET / GETNEXT / WALK  UDP/1161
  |-- same network origin
  `-- v2c TRAP              UDP/162/1162
          |
          v
      Site Mapper
```

`telxius-smartpack2-client-parity-traps` uses
`network_mode: service:telxius-smartpack2`. Polling and traps therefore leave the BFDB stack
through the same emulated controller network namespace. Site Mapper source authorization can use
one sender origin, one v2c principal and one source identity exactly as it will for a commissioned
physical controller.

The controlled sequence reproduces the field-observed Eltek rev54 control-system notification:

- notification: `alarmControlSystemTrap` (`1.3.6.1.4.1.12148.10.1.2.6`);
- source description: `CtrlUnitPower`;
- status object: `1.3.6.1.4.1.12148.10.13.12.1.1.0`;
- condition: `3` (raw vendor condition observed as Major Alarm);
- measured object: `1.3.6.1.4.1.12148.10.13.12.1.5.0`;
- measured value: `1`;
- alarm trap counter varbind: `0`;
- transition: ON followed by OFF/CLEAR.

The PDU uptime and the alarm trap counter are modeled independently. This matters because the
physical capture showed a non-zero `sysUpTime` while `alarmTrapCounterVarValue` was zero.

## Run

Keep the customer evidence and all secrets outside Git. Point
`TELXIUS_SNMP_EVIDENCE_DIR` at the private walk/MIB directory and choose a lab-only v2c
community. Configure Site Mapper's industrial receiver to authorize that same community and the
actual sender IP it observes.

```bash
docker compose --env-file .env.telxius \
  -f docker-compose.telxius-seed-01.yml \
  --profile telxius-client-parity \
  up -d --build telxius-smartpack2

docker compose --env-file .env.telxius \
  -f docker-compose.telxius-seed-01.yml \
  --profile telxius-client-parity \
  run --rm --no-deps telxius-smartpack2-client-parity-traps
```

Required private runtime values:

```dotenv
TELXIUS_SNMP_EVIDENCE_DIR=./.private-evidence/telxius-smartpack2
TELXIUS_SNMP_COMMUNITY=<lab-only-readonly-community>
TELXIUS_SITE_MAPPER_SNMP_HOST=<reachable-site-mapper-snmp-receiver>
TELXIUS_SITE_MAPPER_SNMP_PORT=1162
```

The trap sequence is intentionally one-shot. Re-run it when an explicit ON/OFF transition is
wanted; do not run an infinite alarm loop.

## Acceptance

The parity gate closes only when all of the following are observed without changing Site Mapper
application code:

1. Site Mapper polls `batteryVoltageValue.0` from the emulator and preserves RAW `5389`.
2. The commissioned scale produces `53.89 V`.
3. Site Mapper receives the CtrlUnitPower Major ON trap from the same source origin used for poll.
4. RAW notification OID, status OID, condition, on/off, measured OID/value and counter are
   queryable after ingestion.
5. The existing Eltek parser derives the controller alarm signal.
6. The OFF/CLEAR trap resolves that same condition rather than opening a second occurrence.
7. Mongo/Timescale persistence remains healthy.
8. Existing MQTT, BFDB Config 2/4, PowerPath and Modbus paths are unchanged.

Field substitution then changes endpoint, credentials and commissioned source/target identity only.
If replacing the emulator with the physical controller requires an emulator-specific Site Mapper
code path, this parity gate has failed.
