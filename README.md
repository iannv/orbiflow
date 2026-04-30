# Orbiflow
OrbiFlow es un sistema integral de gestión diseñado específicamente para las necesidades de las cooperativas de trabajo. Permite gestionar asociados, liquidaciones de retiros y aplicar reglas de negocio dinámicas con total transparencia y soberanía tecnológica.

## Requisitos Previos

- Docker
- Docker Compose

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
docker compose up --build
```

Esto iniciará los contenedores para la base de datos, el backend y el frontend. 

El backend migrará automáticamente la base de datos al iniciarse, y el frontend se construirá con la configuración de desarrollo.

## Gestión de la Aplicación

Una vez que los contenedores estén corriendo, debes crear el superusuario para acceder al panel de Django:

 ```bash
   docker compose exec backend python manage.py createsuperuser
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

4. Correr los tests del backend:

   ```bash
   docker compose exec backend python manage.py test
   ```

5. Correr los tests del frontend:

   ```bash
   docker compose exec frontend npm test
   ```

## Desarrollo y modelos de datos

Si realizás cambios en cualquier archivo `models.py`, debés seguir este flujo para que impacten en la base de datos:

1. **Generar el archivo de migración** (esto crea el archivo .py con tus cambios):
   ```bash
   docker compose run --rm backend python manage.py makemigrations orbiflow
   ```
2. **Aplicar la migración a la base de datos** (esto actualiza la DB con los cambios):
   ```bash
   docker compose run --rm backend python manage.py migrate
   ```
*Nota: El comando docker compose up aplica automáticamente las migraciones pendientes, pero NO las genera. Si sos quien modifica el modelo, recordá siempre generar la migración y pushearla al repositorio.*



## Comandos Útiles de Desarrollo

Ver logs en tiempo real

   ```bash
   docker compose logs -f
   ```
Actualizar modelos (Migraciones)
```bash
docker compose run --rm backend python manage.py makemigrations orbiflow
   ```
Aplicar cambios a la DB	docker 
```bash
docker compose run --rm backend python manage.py migrate
```
Limpiar todo (Reset DB)	
```bash
docker compose down -v
```
## Algunos comandos útiles

Si solo querés iniciar los servicios sin reconstruir las imágenes, podés usar:
>
>```bash
>docker compose up
>```

Si realizaste cambios en el código y querés reconstruir solo el backend o el frontend, podés usar:
>
> ```bash
> docker compose build backend   # or frontend
> docker compose up
> ```

Para reiniciar los servicios después de detenerlos:
>```bash
>docker compose start
>```
