#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MOSQUITTO_ID="$(docker compose ps -q mosquitto)"

if [[ -z "$MOSQUITTO_ID" ]]; then
  echo "ERROR: Mosquitto container is not running." >&2
  echo "Start the stack first with: make up" >&2
  echo "or: make remote-up" >&2
  exit 1
fi

NETWORK="$(docker inspect "$MOSQUITTO_ID" --format '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{println}}{{end}}' | head -n 1)"

if [[ -z "$NETWORK" ]]; then
  echo "ERROR: could not determine Docker network." >&2
  exit 1
fi

REMOTE_PROFILE=false
if docker inspect "$MOSQUITTO_ID" --format '{{range .Mounts}}{{println .Source}}{{end}}' | grep -q 'mosquitto.remote.conf'; then
  REMOTE_PROFILE=true
fi

ARGS=(
  --rm -it
  --network "$NETWORK"
  eclipse-mosquitto:2.0
  mosquitto_sub
  -h mosquitto
  -p 1883
  -t 'data/dev/#'
  -v
)

if [[ "$REMOTE_PROFILE" == "true" ]]; then
  if [[ ! -f .env.remote ]]; then
    echo "ERROR: authenticated Mosquitto profile is running but .env.remote is missing." >&2
    exit 1
  fi

  REVIEWER_PASS="$(sed -n 's/^MQTT_REVIEWER_PASSWORD=//p' .env.remote | tail -n 1)"
  if [[ -z "$REVIEWER_PASS" ]]; then
    echo "ERROR: MQTT_REVIEWER_PASSWORD missing from .env.remote." >&2
    exit 1
  fi

  ARGS+=( -u bfdb-reviewer -P "$REVIEWER_PASS" )
fi

echo "Docker network: $NETWORK"
echo "Broker profile: $([[ "$REMOTE_PROFILE" == "true" ]] && echo authenticated || echo local-anonymous)"
echo "Subscribing to: data/dev/#"
echo "Press Ctrl+C to stop."
echo

docker run "${ARGS[@]}"
