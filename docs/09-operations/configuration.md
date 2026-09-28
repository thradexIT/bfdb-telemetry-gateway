# Configuration

Configuration is externalized under `config/`, Docker Compose, and environment variables.

## Primary configuration files

- `config/devices.yaml` — logical BFDB, synthetic serial, Unit ID and identity rules.
- `config/emulator.yaml` — electrical model and MQTT publishing behavior.
- `config/modbus-map.yaml` — Modbus map and encoding baseline.
- `config/quality.yaml` — freshness threshold and quality bits.
- `infra/mosquitto/mosquitto.conf` — anonymous local lab broker.
- `infra/mosquitto/mosquitto.remote.conf` — authenticated remote-review broker.
- `infra/mosquitto/acl` — remote-review MQTT permissions.

## Main environment variables

Gateway/emulator endpoint variables include:

```text
MQTT_HOST
MQTT_PORT
MQTT_TOPIC
MQTT_USERNAME
MQTT_PASSWORD
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
MODBUS_HOST
MODBUS_PORT
STALE_AFTER_SECONDS
```

Defaults are intended for the Docker lab environment.

## Local lab

```bash
cp .env.example .env
docker compose up --build
```

## Authenticated remote review

Generate secrets:

```bash
make remote-setup
```

Creates local-only:

```text
.env.remote
infra/mosquitto/secrets/passwd
```

Start:

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

Recover only the reviewer credentials:

```bash
make remote-creds
```

Open the current no-card Pinggy TCP path:

```bash
make pinggy
```

Always pass `--env-file .env.remote` when using the remote overlay.

## Credential scope

Remote profile roles:

```text
bfdb-emulator  publish-only
bfdb-gateway   read-only
bfdb-reviewer  read-only
```

Do not reuse reviewer credentials for emulator/gateway runtime identities.

## Secrets rule

Production configuration must not embed secrets in Git.

Never commit:

- `.env.remote`;
- generated password files;
- tunnel provider tokens;
- production broker credentials;
- database production passwords.

## Windows + WSL line endings

The repository includes `.gitattributes` to force LF for shell scripts and common source/config files so WSL execution does not break on CRLF.
