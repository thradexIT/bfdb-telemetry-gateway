# Security Baseline

## Local lab profile

The default included Mosquitto configuration allows anonymous MQTT to accelerate local PoC testing.

This profile must remain local-only.

## Authenticated remote-review profile

`docker-compose.remote.yml` overlays the local stack with:

- `allow_anonymous false`;
- password file authentication;
- MQTT ACLs;
- separate emulator/gateway/reviewer identities.

Current ACL intent:

```text
bfdb-emulator
  write data/dev/#

bfdb-gateway
  read data/dev/#

bfdb-reviewer
  read data/dev/#
```

Secrets are generated locally and stored outside Git:

```text
.env.remote
infra/mosquitto/secrets/passwd
```

Both are ignored by `.gitignore`.

## Remote review exposure

The 2026-09-25 lab used an ephemeral reverse TCP tunnel only for MQTT.

Allowed review exposure:

```text
MQTT broker :1883 -> ephemeral public TCP host:port
```

Do not expose:

- TimescaleDB/PostgreSQL 5432;
- Modbus TCP 1502 or 502;
- Docker daemon;
- SSH/admin services;
- secret files.

The reviewer receives only:

- temporary public host;
- temporary public port;
- `bfdb-reviewer` username;
- reviewer password.

## Encryption limitation

The currently demonstrated free remote-review path uses native MQTT plus broker authentication/ACL over a TCP tunnel.

It is suitable only as a short-lived PoC review mechanism.

It is **not** the production security model and must not be described as end-to-end MQTTS/TLS.

## Production principles

Production hardening requires:

- broker authentication;
- TLS where supported and approved;
- secrets outside Git and preferably managed centrally;
- segmented OT/IT network;
- firewall only required flows;
- bind Modbus only to intended interfaces;
- never expose TCP/502 to the public Internet;
- read-only Modbus surface;
- restrict database network exposure;
- credential rotation;
- auditable configuration;
- observability and incident diagnostics.

The anonymous lab broker and ephemeral tunnel configuration must not be promoted unchanged to production.
