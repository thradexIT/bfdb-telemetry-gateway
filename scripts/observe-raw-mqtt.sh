#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MOSQUITTO_ID="$(docker compose ps -q mosquitto)"

if [[ -z "$MOSQUITTO_ID" ]]; then
  echo "ERROR: Mosquitto container is not running." >&2
  echo "Start the stack first." >&2
  exit 1
fi

NETWORK="$(docker inspect "$MOSQUITTO_ID" --format '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{println}}{{end}}' | head -n 1)"

if [[ -z "$NETWORK" ]]; then
  echo "ERROR: could not determine Docker network." >&2
  exit 1
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

if [[ -f .env.remote ]]; then
  REVIEWER_PASS="$(sed -n 's/^MQTT_REVIEWER_PASSWORD=//p' .env.remote | tail -n 1)"
  if [[ -n "$REVIEWER_PASS" ]]; then
    ARGS+=( -u bfdb-reviewer -P "$REVIEWER_PASS" )
  fi
fi

echo "Docker network: $NETWORK"
echo "Subscribing to: data/dev/#"
echo "Press Ctrl+C to stop."
echo

docker run "${ARGS[@]}"
