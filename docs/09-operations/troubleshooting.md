# Troubleshooting

## MQTT Explorer sees no data

Check:

```bash
docker compose ps
```

Then verify:

- Mosquitto is running;
- emulator logs contain `MQTT_TX`;
- gateway logs contain `MQTT_RX`;
- topic subscription is `data/dev/#`;
- reviewer credentials are correct when using the authenticated profile.

Direct broker test:

```bash
make raw
```

The helper discovers the current Compose network and automatically uses the reviewer credential when the authenticated broker profile is active.

## Remote MQTT Explorer cannot connect

For a raw TCP tunnel use:

```text
Protocol: mqtt://
SSL/TLS: OFF
Path: empty
```

Do not use `wss://` or `/mqtt` unless a WebSocket listener is deliberately configured.

Confirm the temporary tunnel terminal is still open and the host/port have not expired.

## Why is the public MQTT port not 1883?

A reverse tunnel command such as:

```bash
ssh -p 443 -R0:127.0.0.1:1883 tcp@free.pinggy.io
```

asks the provider to allocate any available remote port because of `-R0`.

Example:

```text
public-host:36771 -> 127.0.0.1:1883
```

Mosquitto still listens locally on 1883.

## ngrok TCP refuses to start

Observed on 2026-09-25:

```text
ERR_NGROK_8013
You must add a credit or debit card before you can use TCP endpoints on a free account.
```

Use the documented Pinggy path for the no-card lab flow.

## `cloudflared: command not found`

That only means `cloudflared` is not installed in the current shell/environment.

Also note that a Cloudflare Quick Tunnel serving HTTP is not equivalent to a native MQTT TCP endpoint for MQTT Explorer Desktop.

## Docker network not found

If:

```text
network bfdb-telemetry-gateway_default not found
```

first start the compose stack.

Then determine the actual network rather than guessing:

```bash
MOSQUITTO_ID=$(docker compose ps -q mosquitto)

docker inspect "$MOSQUITTO_ID" \
  --format '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{println}}{{end}}'
```

Use the returned network name.

## Docker says port 3000 is already allocated

A host port is already in use.

Check:

```bash
docker ps --filter publish=3000
```

or select another host port, e.g. `3001:3000`.

This issue applies to web tools only and is unrelated to raw MQTT TCP on 1883.

## Container name already in use

Example:

```text
Conflict. The container name "/bfdb-mqtt-explorer" is already in use
```

Inspect:

```bash
docker ps -a --filter name=bfdb-mqtt-explorer
```

If safe to recreate:

```bash
docker rm -f bfdb-mqtt-explorer
```

## WSL: `python: command not found`

Use:

```bash
python3 tools/modbus-reader/read.py ...
```

The Windows environment may expose `python` while Ubuntu/WSL exposes `python3`.

## PowerShell rejects Bash backslashes

This is invalid PowerShell:

```powershell
python tool.py \
  --host ...
```

Bash uses backslash for line continuation. In PowerShell use one line or PowerShell's own continuation syntax.

Safe one-line example:

```powershell
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1
```

## Shell script reports invalid `pipefail`

If:

```text
invalid option name
set: pipefail
```

after a Windows checkout, the script likely has CRLF line endings.

Fix:

```bash
sed -i 's/\r$//' scripts/setup-ngrok-review.sh
```

The repository now includes:

```text
*.sh text eol=lf
```

in `.gitattributes`.

## I forgot the MQTT reviewer password

Use:

```bash
make remote-creds
```

or:

```bash
grep MQTT_REVIEWER_PASSWORD .env.remote
```

If `.env.remote` does not exist, generate/rotate credentials:

```bash
make remote-setup
```

## I still see `0_1_96`

That is the superseded flat-identity emulator.

Current expected groups are:

```text
0_1_1..0_1_24
0_2_1..0_2_24
0_3_1..0_3_24
0_4_1..0_4_24
```

Rebuild the current revision:

```bash
make remote-down
make remote-up
```

or for the local anonymous lab:

```bash
docker compose down
docker compose up -d --build
```

## Docker Compose warns MQTT password variables are blank

If using `docker-compose.remote.yml`, always include:

```bash
--env-file .env.remote
```

Example:

```bash
docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  ps
```

## TSDB is empty

- inspect telemetry-gateway logs for `DECODE_ERROR` / DB errors;
- verify serial mapping in `config/devices.yaml`;
- verify `MQTT_RX` is present;
- query `telemetry_samples` directly.

## Modbus returns zero

Zero can be:

- a real measured/emulated zero;
- an uninitialized register.

Inspect the corresponding quality word. Quality 0 means MISSING/not yet valid.

## Point rejected

Check Identity Resolver configuration.

Production mapping is intentionally explicit rather than guessed.

## Remote review security reminder

Never tunnel:

- PostgreSQL 5432;
- Modbus 1502/502;
- Docker daemon;
- host SSH/admin services.

Remote review should expose only the MQTT path and only with the read-only reviewer credential.
