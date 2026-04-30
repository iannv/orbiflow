# Orbiflow
OrbiFlow es un sistema integral de gestión diseñado específicamente para las necesidades de las cooperativas de trabajo. Permite gestionar asociados, liquidaciones de retiros y aplicar reglas de negocio dinámicas con total transparencia y soberanía tecnológica.

## Requisitos Previos

- Docker
- Docker Compose
- Make

## Configuración Inicial (Paso a Paso)
1. Clonar el repositorio
```bash
git clone git@github.com:iannv/orbiflow.git
cd orbiflow
```
2. Crear el archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
DB_HOST=db
DB_NAME=orbiflow_db
DB_USER=admin
DB_PASS=************

POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_HOST=db
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=tu_clave_secreta_aqui
DJANGO_DEBUG=true
```

3. Levantar los servvicios

Desde la raíz del proyecto:

```bash
make build
```

Esto iniciará los contenedores para la base de datos, el backend y el frontend. El backend migrará automáticamente la base de datos al iniciarse.

## Gestión de la Aplicación

Una vez que los contenedores estén corriendo, debes crear el superusuario para acceder al panel de Django:

 ```bash
make superuser
```
Seguí las instrucciones para ingresar un nombre de usuario, correo electrónico y contraseña. Después de crear el superusuario, podrás acceder al panel de administración en `http://localhost:8000/admin` con las credenciales que acabas de crear.

## Accesos Rápidos
- **Backend (Django):** `http://localhost:8000/admin`
- **Frontend (Angular):** `http://localhost:4200`
- **Base de Datos (PostgreSQL):** `localhost:5432` (con las credenciales definidas en el archivo `.env`)

## Confirmar Funcionamiento

1. Confirmar que los contenedores están corriendo:

   ```bash
   docker compose ps
   ```

2. Check el estado del backend:

   ```bash
   curl http://localhost:8000/api/health/
   ```

   Respuesta esperada:

   ```json
   {"status":"ok","database":"connected"}
   ```

3. Abrir el frontend en el navegador:

   - `http://localhost:4200`
   - Deberías ver la página de inicio de Orbiflow sin errores.

4. Correr los tests 

   ```bash
   make tests
   ```

## Desarrollo y modelos de datos

Si realizás cambios en los archivos `models.py`, seguí este flujo:
1.  **Generar migración:** `make makemigrations`
2.  **Aplicar cambios:** `make migrate`
3.  **Pushear cambios:** Asegurate de incluir el archivo de migración generado en tu commit.


## 💡 Comandos Rápidos (Makefile)

Para facilitar el desarrollo, usamos un `Makefile`. Podés ejecutar estos comandos desde la raíz:

| Tarea | Comando |
| :--- | :--- |
| **Levantar proyecto** | `make up` |
| **Reconstruir y levantar** | `make build` |
| **Correr todos los tests** | `make tests` |
| **Generar migraciones** | `make makemigrations` |
| **Aplicar migraciones** | `make migrate` |
| **Crear administrador** | `make superuser` |
| **Ver logs del backend** | `make logs` |
| **Detener contenedores** | `make down` |
| **Limpiar base de datos** | `make clean` |
| **Entrar a la terminal de la DB** | `make db-shell` |
| **Entrar al shell de Django** | `make shell` |


*Nota: Si no tenés `make` instalado, podés seguir usando los comandos de `docker compose` detallados arriba.*