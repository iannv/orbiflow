.PHONY: up build stop down logs tests makemigrations migrate superuser reset-db help

# Ayuda: Muestra los comandos disponibles
help:
	@echo "Comandos disponibles en OrbiFlow:"
	@echo "  make up               Levanta los servicios en segundo plano"
	@echo "  make build            Reconstruye imágenes y levanta servicios"
	@echo "  make stop             Detiene los contenedores sin eliminarlos"
	@echo "  make down             Baja los servicios y elimina contenedores"
	@echo "  make clean            LIMPIEZA TOTAL: Borra contenedores y VOLÚMENES (DB)"
	@echo "  make logs             Muestra logs del backend en tiempo real"
	@echo "  make tests            Ejecuta las pruebas de Backend y Frontend"
	@echo "  make makemigrations   Genera nuevos archivos de migración (orbiflow)"
	@echo "  make migrate          Aplica las migraciones pendientes a la DB"
	@echo "  make superuser        Crea un administrador para Django"
	@echo "  make db-shell         Entrar a la terminal de la DB"
	@echo "  make shell            Entrar al shell de Django"
	@echo "  make data-diagram     Genera diagrama de clases"

# Gestión de contenedores
up:
	docker compose up -d

build:
	docker compose up --build

stop:
	docker compose stop

down:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f backend

# Calidad y Testing
tests:
	@echo "--- Corriendo tests del Backend ---"
	docker compose run --rm backend python manage.py test
	@echo "--- Corriendo tests del Frontend ---"
	docker compose run --rm frontend npx ng test --no-watch

# Base de Datos y Modelos
makemigrations:
	docker compose run --rm backend python manage.py makemigrations orbiflow

migrate:
	docker compose run --rm backend python manage.py migrate

superuser:
	docker compose exec backend python manage.py createsuperuser


# Entrar a la terminal de la DB
db-shell:
	docker compose exec db psql -U admin -d orbiflow_db

# Entrar al shell de Django
shell:
	docker compose exec backend python manage.py shell

data-diagram:
	docker compose exec backend python manage.py graph_models orbiflow -g -o orbiflow_core.png