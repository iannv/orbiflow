# Orbiflow


## Requerimientos

- Docker
- Docker Compose
- A root `.env` file

Necesitamos crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

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

## Levantar el Proyecto

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Esto iniciará los contenedores para la base de datos, el backend y el frontend. Los servicios estarán disponibles en:

- PostgreSQL on `localhost:5432` (Por ahora local, es decir mirar en cada gestor de base de datos)
- Django on `http://localhost:8000/admin`
- Angular on `http://localhost:4200`

El backend migrará automáticamente la base de datos al iniciarse, y el frontend se construirá con la configuración de desarrollo.

## Configuración del Administrador (Solo la primera vez)

Una vez que los contenedores estén corriendo, debes crear el superusuario para acceder al panel de Django:

 ```bash
   docker compose exec backend python manage.py createsuperuser
```
Seguí las instrucciones para ingresar un nombre de usuario, correo electrónico y contraseña. Después de crear el superusuario, podrás acceder al panel de administración en `http://localhost:8000/admin` con las credenciales que acabas de crear.


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



## Detener y Limpiar

Para detener los contenedores sin eliminarlos:
```bash
docker compose stop
```

Para detener los servicios:
```bash
docker compose down
```

Para eliminar también los volúmenes de datos (esto eliminará la base de datos y cualquier dato persistente):

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
