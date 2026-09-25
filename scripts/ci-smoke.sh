#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose logs --no-color > /tmp/bfdb-compose.log 2>&1 || true
  docker compose down -v || true
}
trap cleanup EXIT

docker compose up -d --build

echo "Waiting for telemetry..."
COUNT=0
for i in $(seq 1 40); do
  COUNT=$(docker compose exec -T timescaledb psql -U bfdb -d bfdb -Atc "SELECT count(*) FROM telemetry_samples;" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    break
  fi
  sleep 2
done

test "$COUNT" -gt 0

echo "telemetry_samples=$COUNT"
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 1 --circuit 1
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 2 --circuit 1
python tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 3 --circuit 1

docker compose exec -T timescaledb psql -U bfdb -d bfdb -c "SELECT bfdb_id,count(*) FROM telemetry_samples GROUP BY bfdb_id ORDER BY bfdb_id;"
