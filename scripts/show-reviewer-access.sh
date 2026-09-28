#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.remote"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE does not exist." >&2
  echo "Run: make remote-setup" >&2
  exit 1
fi

REVIEWER_PASS="$(sed -n 's/^MQTT_REVIEWER_PASSWORD=//p' "$ENV_FILE" | tail -n 1)"

if [[ -z "$REVIEWER_PASS" ]]; then
  echo "ERROR: MQTT_REVIEWER_PASSWORD was not found in $ENV_FILE." >&2
  exit 1
fi

cat <<EOF
Reviewer MQTT access

Username: bfdb-reviewer
Password: $REVIEWER_PASS
Topic:    data/dev/#

Local broker:
  Host: 127.0.0.1
  Port: 1883
  Protocol: mqtt://
  SSL/TLS: OFF

For public review, start Pinggy:
  make pinggy

Then use the host and port printed by Pinggy with the same username/password.
EOF
