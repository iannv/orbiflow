.PHONY: help build-local build-sandbox build-prod up-local up-sandbox up-prod \
        stop down clean logs tests makemigrations migrate superuser shell data-diagram

# El compose interpola ${ENV_FILE:-.env.local} para el servicio backend.
# Cada target de abajo sobrescribe ENV_FILE; se exporta para llegar a docker compose.
export ENV_FILE ?= .env.local

help:
	@echo "Comandos disponibles en OrbiFlow:"
	@echo "  make build-local      Construye y levanta backend+frontend con DB Docker (.env.local)"
	@echo "  make build-sandbox    Construye y levanta backend+frontend contra Neon Sandbox (.env.sandbox)"
	@echo "  make build-prod       Construye y levanta backend+frontend contra Neon Producción (.env.prod)"
	@echo "  make up-local         Igual que build-local pero sin reconstruir imágenes"
	@echo "  make up-sandbox       Igual que build-sandbox pero sin reconstruir"
	@echo "  make up-prod          Igual que build-prod pero sin reconstruir"
	@echo "  make stop             Detiene contenedores"
	@echo "  make down             Baja servicios y elimina contenedores"
	@echo "  make clean            LIMPIEZA TOTAL: contenedores + volúmenes"
	@echo "  make logs             Logs en vivo del backend"
	@echo "  make migrate          Aplica migraciones en el entorno activo"
	@echo "  make makemigrations   Genera migraciones"
	@echo "  make superuser        Crea administrador"
	@echo "  make shell            Shell de Django"
	@echo "  make tests            Tests de backend y frontend (siempre con .env.local)"
	@echo "  make data-diagram     Diagrama de clases"

# --- Build + up ---
build-local: ENV_FILE=.env.local
build-local:
	docker compose --profile local up --build -d

build-sandbox: ENV_FILE=.env.sandbox
build-sandbox:
	docker compose up --build -d

build-prod: ENV_FILE=.env.prod
build-prod:
	docker compose up --build -d

# --- Up (sin reconstruir) ---
up-local: ENV_FILE=.env.local
up-local:
	docker compose --profile local up -d

up-sandbox: ENV_FILE=.env.sandbox
up-sandbox:
	docker compose up -d

up-prod: ENV_FILE=.env.prod
up-prod:
	docker compose up -d

# --- Ciclo de vida ---
stop:
	docker compose --profile local stop

down:
	docker compose --profile local down

clean:
	docker compose --profile local down -v

logs:
	docker compose logs -f backend

# --- Tareas de Django (usan el contenedor backend y su env activo) ---
makemigrations:
	docker compose run --rm backend python manage.py makemigrations orbiflow

migrate:
	docker compose run --rm backend python manage.py migrate

superuser:
	docker compose exec backend python manage.py createsuperuser

shell:
	docker compose exec backend python manage.py shell

data-diagram:
	docker compose exec backend python manage.py graph_models orbiflow -g -o orbiflow_core.png

# --- Tests siempre con DB local ---
tests: ENV_FILE=.env.local
tests:
	docker compose --profile local up -d db
	docker compose run --rm backend python manage.py test --keepdb
	docker compose run --rm frontend npx ng test
