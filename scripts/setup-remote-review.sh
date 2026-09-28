#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="$ROOT/infra/mosquitto/secrets"
ENV_FILE="$ROOT/.env.remote"

command -v docker >/dev/null 2>&1 || {
  echo "ERROR: docker is required." >&2
  exit 1
}

command -v openssl >/dev/null 2>&1 || {
  echo "ERROR: openssl is required." >&2
  exit 1
}

mkdir -p "$SECRETS_DIR"

EMULATOR_PASS="${MQTT_EMULATOR_PASSWORD:-$(openssl rand -hex 18)}"
GATEWAY_PASS="${MQTT_GATEWAY_PASSWORD:-$(openssl rand -hex 18)}"
REVIEWER_PASS="${MQTT_REVIEWER_PASSWORD:-$(openssl rand -hex 18)}"

cat > "$ENV_FILE" <<EOF
MQTT_EMULATOR_PASSWORD=$EMULATOR_PASS
MQTT_GATEWAY_PASSWORD=$GATEWAY_PASS
MQTT_REVIEWER_PASSWORD=$REVIEWER_PASS
EOF
chmod 600 "$ENV_FILE"

export MQTT_EMULATOR_PASSWORD="$EMULATOR_PASS"
export MQTT_GATEWAY_PASSWORD="$GATEWAY_PASS"
export MQTT_REVIEWER_PASSWORD="$REVIEWER_PASS"

docker run --rm \
  -e MQTT_EMULATOR_PASSWORD \
  -e MQTT_GATEWAY_PASSWORD \
  -e MQTT_REVIEWER_PASSWORD \
  -v "$SECRETS_DIR:/work" \
  eclipse-mosquitto:2.0 \
  sh -lc '
    rm -f /work/passwd
    mosquitto_passwd -b -c /work/passwd bfdb-emulator "$MQTT_EMULATOR_PASSWORD"
    mosquitto_passwd -b /work/passwd bfdb-gateway "$MQTT_GATEWAY_PASSWORD"
    mosquitto_passwd -b /work/passwd bfdb-reviewer "$MQTT_REVIEWER_PASSWORD"
    chmod 600 /work/passwd
  '

cat <<EOF

Remote-review MQTT credentials created.

Reviewer username: bfdb-reviewer
Reviewer password: $REVIEWER_PASS

Local secret files:
  $ENV_FILE
  $SECRETS_DIR/passwd

Both paths are ignored by Git.

Next:
  make remote-up

To display only the reviewer credentials later:
  make remote-creds

To create the public Pinggy TCP endpoint:
  make pinggy

Share ONLY:
  - Pinggy public host
  - Pinggy public port
  - username: bfdb-reviewer
  - reviewer password

EOF
