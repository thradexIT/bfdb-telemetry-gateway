.PHONY: help up down logs ps test raw tsdb modbus remote-setup remote-up remote-down remote-ps remote-logs remote-creds pinggy

help:
	@echo "BFDB Telemetry Gateway"
	@echo
	@echo "Local lab:"
	@echo "  make up            Build and start the local lab"
	@echo "  make ps            Show local container status"
	@echo "  make logs          Follow local logs"
	@echo "  make raw           Watch RAW MQTT on data/dev/#"
	@echo "  make tsdb          Show latest historical telemetry"
	@echo "  make modbus        Read BFDB-01 / Circuit 1 over Modbus"
	@echo "  make test          Run unit tests"
	@echo "  make down          Stop the local stack"
	@echo
	@echo "Authenticated remote review:"
	@echo "  make remote-setup  Generate/rotate MQTT credentials"
	@echo "  make remote-up     Start authenticated broker + stack"
	@echo "  make remote-creds  Show ONLY reviewer username/password"
	@echo "  make remote-ps     Show authenticated stack status"
	@echo "  make remote-logs   Follow authenticated stack logs"
	@echo "  make pinggy        Open free ephemeral TCP tunnel to MQTT :1883"
	@echo "  make remote-down   Stop authenticated stack"

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

test:
	python3 -m pytest -q

raw:
	bash scripts/observe-raw-mqtt.sh

tsdb:
	docker compose exec timescaledb psql -U bfdb -d bfdb -c "SELECT observed_at,bfdb_id,circuit_id,raw_point_id,voltage_v,current_a,power_w,energy_kwh FROM telemetry_samples ORDER BY observed_at DESC LIMIT 20;"

modbus:
	python3 tools/modbus-reader/read.py --host 127.0.0.1 --port 1502 --unit 1 --circuit 1

remote-setup:
	bash scripts/setup-remote-review.sh

remote-up:
	bash scripts/start-remote-review.sh

remote-down:
	docker compose --env-file .env.remote -f docker-compose.yml -f docker-compose.remote.yml down

remote-ps:
	docker compose --env-file .env.remote -f docker-compose.yml -f docker-compose.remote.yml ps

remote-logs:
	docker compose --env-file .env.remote -f docker-compose.yml -f docker-compose.remote.yml logs -f

remote-creds:
	bash scripts/show-reviewer-access.sh

pinggy:
	@echo "Opening Pinggy TCP tunnel: public random port -> 127.0.0.1:1883"
	@echo "Keep this terminal open. Press Ctrl+C to close remote access."
	ssh -p 443 -R0:127.0.0.1:1883 tcp@free.pinggy.io
