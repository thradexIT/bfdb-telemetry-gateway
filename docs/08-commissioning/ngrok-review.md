# ngrok Remote MQTT Review

This profile exposes the lab MQTT broker through an ephemeral ngrok TCP endpoint while requiring Mosquitto credentials.

## Security model

Accounts:
- `bfdb-emulator`: publish-only to `data/dev/#`
- `bfdb-gateway`: read-only from `data/dev/#`
- `bfdb-reviewer`: read-only from `data/dev/#`

The reviewer cannot publish telemetry.

Do not share:
- ngrok authtoken;
- emulator/gateway credentials;
- `.env.remote`;
- Mosquitto password file.

## 1. Generate local credentials

From WSL/Linux:

```bash
bash scripts/setup-ngrok-review.sh
```

The script generates random credentials, writes `.env.remote`, and creates the hashed Mosquitto password file.

## 2. Start the secured broker profile

```bash
docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  up -d --build
```

Verify:

```bash
docker compose -f docker-compose.yml -f docker-compose.remote.yml ps
```

## 3. Start ngrok

Authenticate ngrok once:

```bash
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

Then expose MQTT:

```bash
ngrok tcp 1883
```

ngrok will display a forwarding address similar to:

```text
tcp://0.tcp.ngrok.io:12345
```

## 4. Reviewer MQTT Explorer settings

```text
Host:     0.tcp.ngrok.io
Port:     12345
TLS:      OFF
Username: bfdb-reviewer
Password: <generated reviewer password>
```

Topic:

```text
data/dev/#
```

Expected topics:

```text
data/dev/EMU-BFDB-01
data/dev/EMU-BFDB-02
data/dev/EMU-BFDB-03
```

## 5. Stop remote access

Stopping ngrok immediately removes the public TCP endpoint.

```bash
Ctrl+C
```

Optionally return to the local anonymous lab profile:

```bash
docker compose -f docker-compose.yml -f docker-compose.remote.yml down

docker compose up -d --build
```

## Boundary

This is a PoC remote-review profile, not the production network/security design.
