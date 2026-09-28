#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.remote ]]; then
  echo "ERROR: .env.remote not found." >&2
  echo "Run: make remote-setup" >&2
  exit 1
fi

if [[ ! -f infra/mosquitto/secrets/passwd ]]; then
  echo "ERROR: infra/mosquitto/secrets/passwd not found." >&2
  echo "Run: make remote-setup" >&2
  exit 1
fi

docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  up -d --build

echo
echo "Remote-review stack is up."
echo
docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  ps

echo
echo "Reviewer credentials:"
bash scripts/show-reviewer-access.sh

echo
echo "Next: make pinggy"
