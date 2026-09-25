# ngrok Remote MQTT Review

Status: **ALTERNATIVE / not the currently used free path**

The repository originally documented ngrok TCP for remote MQTT review. During the 2026-09-25 lab session, the free ngrok account returned:

```text
ERR_NGROK_8013
You must add a credit or debit card before you can use TCP endpoints on a free account.
```

Because the requirement was a no-card / full-free lab test, the active lab procedure moved to Pinggy TCP.

Use:

- [Remote MQTT Access](remote-mqtt-access.md) for the current direct MQTT TCP procedure;
- this document only if the ngrok account already permits TCP endpoints.

## Security model

The authenticated broker profile remains the same regardless of tunnel provider:

- `bfdb-emulator`: publish-only to `data/dev/#`;
- `bfdb-gateway`: read-only from `data/dev/#`;
- `bfdb-reviewer`: read-only from `data/dev/#`.

Generate credentials:

```bash
bash scripts/setup-ngrok-review.sh
```

The script name is historical. It generates broker credentials and is not technically coupled to ngrok.

Start the authenticated profile:

```bash
docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  up -d --build
```

If ngrok TCP is available for the account:

```bash
ngrok tcp 1883
```

Then the reviewer uses the returned TCP host/port with:

```text
Protocol: mqtt://
TLS: OFF
Username: bfdb-reviewer
Password: <generated reviewer password>
Topic: data/dev/#
```

Do not share the ngrok authtoken, emulator/gateway credentials, `.env.remote`, or the Mosquitto password file.

This is a PoC commissioning convenience, not a production network/security design.
