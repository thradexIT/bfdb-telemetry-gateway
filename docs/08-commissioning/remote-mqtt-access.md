# Remote MQTT Access — Pinggy + MQTT Explorer

## Goal

Allow another person to use **their own MQTT client / MQTT Explorer Desktop** and receive the exact MQTT telemetry published by the BFDB emulator.

This is a direct MQTT TCP review path. It is not a web dashboard.

```mermaid
flowchart LR
    EMU["Field Emulator"] -->|"MQTT"| MOSQ["Mosquitto :1883"]
    MOSQ -->|"reverse TCP"| PINGGY["Pinggy"]
    PINGGY -->|"public host : random port"| REVIEWER["Remote MQTT Explorer"]
```

## Fast path

From the repository root:

```bash
make remote-setup
make remote-up
make remote-creds
```

Then in a second terminal:

```bash
make pinggy
```

Pinggy prints a temporary endpoint such as:

```text
tcp://example.run.pinggy-free.link:36775
```

Configure MQTT Explorer:

```text
Protocol: mqtt://
Host: example.run.pinggy-free.link
Port: 36775

Username: bfdb-reviewer
Password: <value printed by make remote-creds>

SSL/TLS: OFF
Path: empty
Topic: data/dev/#
```

## Security model

The authenticated profile creates three broker accounts:

| Account | Permission |
|---|---|
| `bfdb-emulator` | publish `data/dev/#` |
| `bfdb-gateway` | read `data/dev/#` |
| `bfdb-reviewer` | read-only `data/dev/#` |

Only the reviewer credential should be shared externally.

Never share:

- emulator password;
- gateway password;
- `.env.remote`;
- Mosquitto password file;
- repository credentials.

## Step 1 — generate or rotate credentials

Recommended:

```bash
make remote-setup
```

Equivalent:

```bash
bash scripts/setup-remote-review.sh
```

Backward-compatible historical command:

```bash
bash scripts/setup-ngrok-review.sh
```

The setup creates:

```text
.env.remote
infra/mosquitto/secrets/passwd
```

Both are ignored by Git.

The script prints:

```text
Reviewer username: bfdb-reviewer
Reviewer password: <generated password>
```

## Step 2 — recover the password later

Recommended:

```bash
make remote-creds
```

Direct file lookup:

```bash
grep MQTT_REVIEWER_PASSWORD .env.remote
```

The value after `=` is the password used by MQTT Explorer.

Do not send the entire `.env.remote` file to a reviewer.

## Step 3 — start the authenticated stack

Recommended:

```bash
make remote-up
```

Equivalent:

```bash
docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  up -d --build
```

Check:

```bash
make remote-ps
```

Expected running services:

```text
mosquitto
timescaledb
telemetry-gateway
field-emulator
```

Follow logs:

```bash
make remote-logs
```

## Step 4 — verify RAW MQTT locally

Recommended:

```bash
make raw
```

The helper automatically discovers the Compose Docker network and detects whether the authenticated or anonymous broker profile is running.

Expected topics:

```text
data/dev/EMU-BFDB-01
data/dev/EMU-BFDB-02
data/dev/EMU-BFDB-03
```

Expected corrected raw point families across successive batches:

```text
0_1_1 .. 0_1_24
0_2_1 .. 0_2_24
0_3_1 .. 0_3_24
0_4_1 .. 0_4_24
```

The following are regression failures:

```text
0_1_25
0_1_49
0_1_96
```

## Step 5 — open Pinggy

In a second terminal:

```bash
make pinggy
```

Equivalent raw command:

```bash
ssh -p 443 -R0:127.0.0.1:1883 tcp@free.pinggy.io
```

Keep this terminal open while the reviewer is connected.

## Why is the Pinggy public port not 1883?

The command uses:

```text
-R0:127.0.0.1:1883
  ^
  0 = ask Pinggy for any available remote port
```

Example:

```text
public-host:36775
        |
        | reverse TCP tunnel
        v
127.0.0.1:1883
        |
        v
Mosquitto
```

Mosquitto still listens locally on 1883.

The public port is temporary transport assigned by Pinggy for that one tunnel session.

## Step 6 — configure MQTT Explorer

If Pinggy prints:

```text
tcp://smaku-38-25-51-24.run.pinggy-free.link:36775
```

MQTT Explorer:

```text
Protocol: mqtt://
Host: smaku-38-25-51-24.run.pinggy-free.link
Port: 36775
Client ID: any unique value

Username: bfdb-reviewer
Password: <make remote-creds>

SSL/TLS: OFF
Clean Session: ON
Path: empty
```

Subscribe:

```text
data/dev/#
```

Do not use:

```text
wss://
Path /mqtt
```

for this flow because Pinggy is carrying native MQTT TCP, not MQTT-over-WebSocket.

## Step 7 — what the reviewer should see

Topic tree:

```text
data
└── dev
    ├── EMU-BFDB-01
    ├── EMU-BFDB-02
    └── EMU-BFDB-03
```

Messages should change continuously:

- `msgid`;
- `timestamp`;
- `sendtime`;
- `reported` point batch;
- V/I/P/E values.

The corrected emulator should never expose one panel as `0_1_1..96`.

## Step 8 — historical and Modbus verification

In another terminal:

```bash
make tsdb
```

and:

```bash
make modbus
```

This verifies the same running system through three different surfaces:

```text
RAW MQTT
  |
  +--> TimescaleDB history
  |
  +--> Latest State --> Modbus TCP
```

## Step 9 — stop access

Stop Pinggy:

```text
Ctrl+C
```

Stop the authenticated stack:

```bash
make remote-down
```

To rotate credentials before a later review:

```bash
make remote-setup
make remote-up
```

## Free-tier behavior observed during lab

The tested unauthenticated Pinggy session explicitly reported:

```text
Your tunnel will expire in 60 minutes.
```

Treat the host and public port as ephemeral.

## Why not ngrok?

During the earlier lab session, the tested free ngrok account returned:

```text
ERR_NGROK_8013
```

and required credit/debit-card verification for TCP endpoints.

The current no-card lab path therefore uses Pinggy.

## Why not Cloudflare Quick Tunnel?

A Cloudflare Quick Tunnel successfully exposed HTTP, but that does not satisfy the direct native MQTT TCP requirement for a desktop MQTT client.

## Production boundary

The lab path is:

```text
native MQTT
+ username/password
+ broker ACL
+ temporary public TCP tunnel
```

This is **not** the production security design.

Production requires an approved encrypted/segmented design such as MQTTS/TLS plus the required OT/IT network controls.

Never expose through this review tunnel:

- TimescaleDB/PostgreSQL `5432`;
- Modbus TCP `1502` or `502`;
- Docker daemon;
- SSH/admin interfaces.

Share externally only:

```text
Pinggy public host
Pinggy public port
Username: bfdb-reviewer
Reviewer password
Topic: data/dev/#
```
