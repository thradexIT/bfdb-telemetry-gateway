#!/usr/bin/env bash
set -euo pipefail

# Backward-compatible wrapper.
# Historical name kept so old notes/commands do not break.
# Canonical script: scripts/setup-remote-review.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "NOTE: setup-ngrok-review.sh is a compatibility wrapper."
echo "Canonical command: bash scripts/setup-remote-review.sh"
echo

exec bash "$ROOT/scripts/setup-remote-review.sh"
