.PHONY: up down logs test ps
up:
	docker compose up --build
down:
	docker compose down
logs:
	docker compose logs -f
ps:
	docker compose ps
test:
	python -m pytest -q
