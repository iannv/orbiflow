.PHONY: help up-local build-local up-cloud build-cloud stop down clean logs tests makemigrations migrate superuser db-shell shell data-diagram

# Ayuda: Muestra los comandos disponibles
help:
	@echo "Comandos disponibles en OrbiFlow:"
	@echo "  make build-local      Local (Docker DB)"
	@echo "  make build-sandbox    Nube (Rama Sandbox Neon)"
	@echo "  make build-prod       Nube (Rama Producción Neon)"
	@echo "  make up-local         Levanta app + base de datos LOCAL (sin buildear)"
	@echo "  make up-sandbox       Levanta app conectada a Nube (Rama Sandbox)"
	@echo "  make up-prod          Levanta app conectada a Nube (Rama Producción)"
	@echo "  make stop             Detiene los contenedores"
	@echo "  make down             Baja los servicios y elimina contenedores"
	@echo "  make clean            LIMPIEZA TOTAL: Borra contenedores y VOLÚMENES"
	@echo "  make logs             Muestra logs del backend"
	@echo "  make tests            Ejecuta tests de Backend y Frontend"
	@echo "  make makemigrations   Genera migraciones en el entorno activo"
	@echo "  make migrate          Aplica migraciones en el entorno activo"
	@echo "  make superuser        Crea administrador en el backend"
	@echo "  make shell            Entrar al shell de Django"
	@echo "  make data-diagram     Genera diagrama de clases"

# Gestión de contenedores con perfiles
up-local:
	cp .env.local .env
	docker compose --profile local up -d

build-local:
	cp .env.local .env
	docker compose --profile local up --build -d

up-sandbox:
	cp .env.sandbox .env
	docker compose --profile sandbox up -d

up-prod:
	cp .env.prod .env
	docker compose --profile prod up -d

build-sandbox:
	cp .env.sandbox .env
	docker compose --profile sandbox up --build -d

build-prod:
	cp .env.prod .env
	docker compose --profile prod up --build -d

stop:
	docker compose --profile local stop
	docker compose stop

down:
	docker compose --profile local down
	docker compose down

clean:
	docker compose --profile local down -v
	docker compose down -v

logs:
	docker compose logs -f backend

# Calidad y Testing
# Calidad y Testing
tests:
	@echo "--- 1. Preparando entorno local para tests ---"
	cp .env.local .env
	docker compose --profile local up -d db
	@echo "--- 2. Limpiando datos de la base de test ---"
	docker compose run --rm backend python manage.py flush --no-input
	@echo "--- 3. Corriendo tests del Backend ---"
	docker compose run --rm backend python manage.py test --keepdb
	@echo "--- 4. Corriendo tests del Frontend ---"
	docker compose run --rm frontend npx ng test --no-watch

test-nuke:
	@echo "--- DESTRUCCIÓN TOTAL Y RECONSTRUCCIÓN ---"
	docker compose --profile local down -v
	make build-local
	make tests

# Base de Datos y Modelos
makemigrations:
	docker compose run --rm backend python manage.py makemigrations orbiflow

migrate:
	docker compose run --rm backend python manage.py migrate

superuser:
	docker compose exec backend python manage.py createsuperuser

# Entrar al shell de Django
shell:
	docker compose exec backend python manage.py shell

data-diagram:
	docker compose exec backend python manage.py graph_models orbiflow -g -o orbiflow_core.png