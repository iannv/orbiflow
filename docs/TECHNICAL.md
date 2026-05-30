# OrbiFlow · Documentación técnica

Guía para desarrolladores del proyecto. Para una introducción al producto, ver el [`README.md`](../README.md) de la raíz.

## Índice

1. [Requisitos](#1-requisitos)
2. [Variables de entorno (`.env.*`)](#2-variables-de-entorno-env)
3. [Comandos del Makefile](#3-comandos-del-makefile)
4. [Flujo de trabajo local](#4-flujo-de-trabajo-local)
5. [Tests](#5-tests)
6. [Migraciones de base de datos](#6-migraciones-de-base-de-datos)
7. [Conexión a Postgres con pgAdmin](#7-conexión-a-postgres-con-pgadmin)
8. [Motor de liquidación](#8-motor-de-liquidación)
9. [Modelo de datos](#9-modelo-de-datos)
10. [Roles y autorizaciones](#10-roles-y-autorizaciones)
11. [API REST](#11-api-rest)
12. [Colecciones Postman](#12-colecciones-postman)
13. [Diagramas de clases](#13-diagramas-de-clases)
14. [Despliegue](#14-despliegue)
15. [Workflow de git](#15-workflow-de-git)

---

## 1. Requisitos

- **Docker** y **Docker Compose** v2 (`docker compose`, no `docker-compose`)
- **make**
- Una cuenta en [Neon](https://neon.tech) si vas a tocar las bases sandbox o prod

No hace falta instalar Python, Node ni Postgres en la máquina — todo corre en contenedores.

---

## 2. Variables de entorno (`.env.*`)

El backend lee sus variables de un `.env.<entorno>`. Hay tres entornos y un mecanismo único que elige cuál cargar.

### Cómo funciona

`docker-compose.yml` resuelve el archivo a cargar con:

```yaml
env_file:
  - ${ENV_FILE:-.env.local}
```

Y cada target del `Makefile` setea la variable `ENV_FILE` correspondiente antes de invocar `docker compose`. No se copia ni se modifica ningún archivo — el archivo elegido se monta tal cual en el contenedor.

### Crear los archivos

Los tres archivos están en `.gitignore`. Hay que crearlos manualmente en la raíz del proyecto.

**`.env.local`** — base de datos en contenedor Docker:

```env
POSTGRES_DB=orbiflow_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=cualquier_password_local
POSTGRES_HOST=db
POSTGRES_PORT=5432
DJANGO_ENV=local
DJANGO_SECRET_KEY=dev-only-key
DJANGO_DEBUG=true
```

**`.env.sandbox`** — apunta al backend local a la branch sandbox de Neon:

```env
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=<password_neon_sandbox>
POSTGRES_HOST=<host>.neon.tech
POSTGRES_PORT=5432
DJANGO_ENV=sandbox
DJANGO_SECRET_KEY=<clave>
DJANGO_DEBUG=true
```

**`.env.prod`** — apunta a la branch productiva de Neon. **Cuidado: cualquier modificación impacta la base real.**

```env
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=<password_neon_prod>
POSTGRES_HOST=<host>.neon.tech
POSTGRES_PORT=5432
DJANGO_ENV=production
DJANGO_SECRET_KEY=<clave_fuerte>
DJANGO_DEBUG=false
```

### Cómo identifica el backend a qué entorno corre

El entrypoint del contenedor lee `DJANGO_ENV`:

- `local` → arranca `python manage.py runserver` (con reload). Postgres en el contenedor `db`, ports `5433:5432`.
- `sandbox` / `production` → corre `collectstatic` + `gunicorn`, hablándole directo a Neon.

---

## 3. Comandos del Makefile

`make help` los lista todos.

| Tarea | Comando |
| --- | --- |
| Levantar + buildear (DB Docker local) | `make build-local` |
| Levantar + buildear (Neon Sandbox) | `make build-sandbox` |
| Levantar + buildear (Neon Producción) | `make build-prod` |
| Levantar sin rebuildear | `make up-local` / `up-sandbox` / `up-prod` |
| Detener contenedores | `make stop` |
| Bajar todo | `make down` |
| Bajar + borrar volúmenes (limpieza total) | `make clean` |
| Logs en vivo del backend | `make logs` |
| Crear superuser | `make superuser` |
| Generar migraciones | `make makemigrations` |
| Aplicar migraciones | `make migrate` |
| Entrar al shell de Django | `make shell` |
| Correr todos los tests (back + front) | `make tests` |
| Diagrama de modelos | `make data-diagram` |

---

## 4. Flujo de trabajo local

Después de cualquier `make build-*` o `make up-*`:

- **UI** → <http://localhost:4200>
- **API** → <http://localhost:8000/api/...>
- **Admin Django** → <http://localhost:8000/admin>
- **Swagger UI** → <http://localhost:8000/api/docs/>
- **Healthcheck** → <http://localhost:8000/api/health/> (debe devolver `{"status":"ok","database":"connected"}`)
- **Postgres local** → `localhost:5433` (Sólo expuesto en `make *-local`; en sandbox/prod no se levanta el contenedor de DB)

### Verificar a qué base está apuntando el backend

```bash
make shell
>>> from django.db import connection
>>> print(connection.settings_dict["HOST"])
```

- `db` → estás en local Docker
- `ep-morning-wind-...neon.tech` → Neon Sandbox
- `ep-lucky-darkness-...neon.tech` → Neon Producción

### Ver tráfico HTTP en tiempo real

```bash
make logs
```

Mantenelo abierto en una terminal mientras hacés peticiones desde la UI o Postman — ves cada `GET/POST/PATCH` que llega a Django.

---

## 5. Tests

Backend y frontend corren con un único comando:

```bash
make tests
```

Internamente:

1. Levanta sólo el contenedor `db` (perfil `local`).
2. Corre `python manage.py test --keepdb` contra esa DB (Django tests con DB reutilizable para acelerar).
3. Corre `npx ng test --watch=false` del frontend (Vitest single-run, no se queda en watch mode).

### CI

Hay un workflow en `.github/workflows/tests.yml` que corre `make tests` en cada push a `develop` y en cada PR contra `develop`/`main`. Si la DB no llega a `healthy` en 50 segundos, el job falla explícitamente con los logs del contenedor.

### Estado actual de los tests del frontend

Hay 14 specs, en su mayoría son los "should create" autogenerados por Angular CLI. Los specs de páginas que disparan HTTP en `ngOnInit` ya tienen `provideHttpClient()` + `provideHttpClientTesting()` para evitar requests reales durante los tests.

Si vas a sumar tests "de verdad", arrancá por:

- Servicios HTTP (`auth.service`, `liquidation-service`, etc.) usando `HttpTestingController`.
- Auth interceptor.
- Componentes de login y de hub de liquidaciones.

---

## 6. Migraciones de base de datos

Si modificás un `models.py`:

```bash
make makemigrations   # genera el archivo de migración
make migrate          # lo aplica en el entorno activo
```

Las migraciones se aplican contra **el entorno activo** (el que está corriendo). Si estás con `make build-sandbox`, `make migrate` modifica Neon Sandbox. Cuidado.

Importante: **siempre commiteá el archivo de migración generado** junto con el cambio del modelo.

---

## 7. Conexión a Postgres con pgAdmin

Procedimiento común en pgAdmin 4: **Servers → Register → Server…**, pestaña **General** ponele un nombre, pestaña **Connection** completá los datos. Para Neon agregá `sslmode=require` en la pestaña **Parameters**.

### Local (`make build-local`)

| Campo | Valor |
| --- | --- |
| Host | `localhost` |
| Port | `5433` |
| Maintenance database | `orbiflow_db` |
| Username | `admin` |
| Password | el que pusiste en `.env.local` |

> El puerto es **5433** (mapeo del compose), no 5432.

### Sandbox / Producción (Neon)

| Campo | Valor |
| --- | --- |
| Host | `ep-<...>.neon.tech` (de tu `.env.sandbox` o `.env.prod`) |
| Port | `5432` |
| Maintenance database | `neondb` |
| Username | `neondb_owner` |
| Password | de tu `.env.*` |
| Parameters → `sslmode` | `require` |

Para confirmar contra qué te conectaste, una vez en pgAdmin:

```sql
SELECT current_database(), current_user, inet_server_addr();
```

---

## 8. Motor de liquidación

OrbiFlow desacopla la **definición de las reglas** (módulos y variantes) de la **ejecución del cálculo** (motor de liquidación).

### Fórmula

```
RetiroBase     = horas_trabajadas * applied_hour_value
Adicionales    = Σ items_calculados
TopeMaximo     = RetiroBase * applied_cap_pct / 100
CapAdjustment  = max(0, Σ items_aplicables_al_tope − TopeMaximo)
Total          = RetiroBase + Adicionales − CapAdjustment
```

Cada item se calcula según el par `calculation_type` (Módulo) × `type` (Variante):

| `calculation_type` | `type`         | Fórmula                       | Nota                                          |
| ------------------ | -------------- | ----------------------------- | --------------------------------------------- |
| `simple`           | `percentage`   | `base * value / 100`          | Bono fijo en porcentaje del retiro base.      |
| `simple`           | `fixed_amount` | `value`                       | Suma directa al adicional.                    |
| `seniority`        | `percentage`   | `base * (value / 100) * años` | Ej. 1% por año, 3 años = 3% del retiro base.  |
| `seniority`        | `fixed_amount` | `value * años`                | Ej. $3.000 por año, 3 años = $9.000.          |

**Años de antigüedad** se calculan desde `Associate.entry_date` hasta el **último día del mes** del periodo (no hasta "hoy"), así un aniversario dentro del mes liquidado ya cuenta.

**Topes**: sólo los módulos con `applies_to_cap=True` cuentan para el tope. El excedente se descuenta del total y se persiste en `RetirementDetail.cap_adjustment`, manteniendo intactos los valores originales de los `LiquidationItem`.

Todos los montos se manejan como `Decimal` y se cuantizan a 2 decimales con `ROUND_HALF_UP`.

### Flujo end-to-end

```text
1. Login (JWT)               POST /api/auth/login/
2. Configuración global      POST /api/config/             { hour_value, cap_pct }
3. Módulos y variantes       POST /api/modules/  + POST /api/variants/
                             (alternativa bulk: POST /api/modules/bulk/)
4. Alta de Asociados         POST /api/users/  + POST /api/associates/
5. Asignar variantes         POST /api/associate-variants/
6. Crear periodo             POST /api/liquidations/         { year, month }
7. Cargar horas (masivo)     POST /api/liquidations/{id}/upload-hours/
                             { "entries": [{ "associate_id": 1, "hours_worked": 160 }] }
8a. Dry-run                  POST /api/liquidations/{id}/calculate/  { "test_mode": true }
8b. Ejecución definitiva     POST /api/liquidations/{id}/calculate/  { "test_mode": false }
9. Resumen / recibos         GET  /api/liquidations/{id}/summary/
                             GET  /api/retirements/?liquidation={id}
```

---

## 9. Modelo de datos

| Entidad               | Rol                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `User` / `Associate`  | Usuario del sistema y legajo del socio.                                                                                                   |
| `Module`              | Concepto de liquidación (Presentismo, Antigüedad, Viáticos, etc.). Define `calculation_type` (`simple` / `seniority`) y `applies_to_cap`. |
| `Variant`             | Opción dentro de un módulo (`fixed_amount` o `percentage`).                                                                               |
| `AssociateVariant`    | Tabla intermedia que asigna variantes al legajo del socio.                                                                                |
| `GlobalConfiguration` | Histórico de Valor Hora y Tope (%) vigentes. Cada cambio queda auditado.                                                                  |
| `LiquidationPeriod`   | Cabecera del mes liquidado. Congela `applied_hour_value` y `applied_cap_pct`.                                                             |
| `RetirementDetail`    | Recibo de un asociado en un periodo. Persiste base, adicionales, `cap_adjustment` y total.                                                |
| `LiquidationItem`     | Línea de detalle (un ítem por variante aplicada).                                                                                         |
| `AuditLog`            | Bitácora de acciones críticas (cambios de configuración, ejecución del motor).                                                            |

Para regenerar el diagrama gráfico: ver [§ 13](#13-diagramas-de-clases).

---

## 10. Roles y autorizaciones

Los roles en código: `admin`, `treasurer` y `associate`.

| Rol | Perfil | Alcance |
| --- | --- | --- |
| **Admin** (`admin`) | Personal técnico o IT. | Acceso total. Crear, leer, actualizar y eliminar cualquier recurso. |
| **Tesorero** (`treasurer`) | Miembro de la cooperativa encargado de la administración financiera. | Operativo amplio. Gestiona liquidaciones, asociados, módulos, variantes y configuración global. No puede borrar usuarios `admin`. |
| **Asociado** (`associate`) | Miembro de la cooperativa. | Sólo lectura. Listar liquidaciones, recibos, usuarios y asociados. Detalle sólo de **sus propios** datos. No accede a módulos, variantes ni configuración. |

### Membresía vs. rol vs. flags de Django

OrbiFlow separa tres conceptos que **no se mezclan**:

| Campo                         | Significado                                                                                            | ¿Define permisos en la API? |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------- |
| `role`                        | Rol funcional en OrbiFlow: `admin`, `treasurer` o `associate`.                                         | **Sí** (única fuente).      |
| `is_coop_member`              | Indica si el usuario es **socio de la cooperativa**. Es info de negocio, no de autorización.           | No.                         |
| `is_staff` (Django)           | Habilita el ingreso al **panel admin** (`/admin/`).                                                    | No.                         |
| `is_superuser` (Django)       | Otorga todos los permisos en el panel admin.                                                           | Sólo como `admin` equivalente. |
| `is_active`                   | Habilita/deshabilita la cuenta para iniciar sesión.                                                    | Indirectamente.             |

Reglas de membresía:

- `role = associate` → `is_coop_member` **debe** ser `true`.
- `role = treasurer` → `is_coop_member` **debe** ser `true`.
- `role = admin` → `is_coop_member` queda libre (personal técnico externo).

> `is_staff` **no** representa membresía cooperativa; sólo el acceso al panel `/admin/` de Django.

---

## 11. API REST

Documentación auto-generada con drf-spectacular.

### Endpoints de documentación

- **Swagger UI (interactiva):** [`/api/docs/`](http://localhost:8000/api/docs/)
- **Redoc (estática):** [`/api/redoc/`](http://localhost:8000/api/redoc/)
- **Esquema OpenAPI:** [`/api/schema/`](http://localhost:8000/api/schema/)

En sandbox: <https://orbiflow-backend-sandbox.onrender.com/api/docs/>.

### Probar endpoints protegidos en Swagger

1. `POST /api/auth/login/` con `{ "username": "...", "password": "..." }` → copiá el `access` del response.
2. Botón **Authorize** (arriba a la derecha) → pegá `Bearer <token>`.
3. Listo, podés ejecutar cualquier endpoint con "Try it out".

---

## 12. Colecciones Postman

En `backend/postman/` hay:

| Archivo | Para qué |
| --- | --- |
| `postmanEnv.json` | Variables (`base_url`, `access_token`, IDs que se populan solos). |
| `orbiflow_happy_path.postman_collection.json` | Camino feliz completo: del login a la liquidación. Importala y corré las requests en orden. |
| `orbiflow_full.postman_collection.json` | Todos los endpoints, para pruebas puntuales. |

Los scripts de test de cada request van completando las variables (`access_token`, `associate_id`, `period_id`, etc.) automáticamente.

---

## 13. Diagramas de clases

`django-extensions` y `graphviz` están preconfigurados en la imagen del backend.

```bash
make data-diagram
```

Genera `orbiflow_core.png` con el modelo de la app `orbiflow`.

---

## 14. Despliegue

### Backend (Render)

Hay dos servicios:

| Servicio | Branch | Base de datos | URL |
| --- | --- | --- | --- |
| `orbiflow-backend-sandbox` | `develop` | Neon Sandbox | <https://orbiflow-backend-sandbox.onrender.com> |
| `orbiflow-backend-prod` | `main` | Neon Producción | <https://orbiflow-backend-prod.onrender.com> *(pendiente de primer merge a `main`)* |

Cada push a `develop` redeploya sandbox; cada merge a `main` redeployará prod.

Variables de entorno mínimas en Render:

- `DJANGO_ENV` → `sandbox` o `production`
- `DJANGO_SECRET_KEY` → clave fuerte, distinta por entorno
- `DJANGO_DEBUG` → `false` en prod, `true` en sandbox si querés páginas de error con detalle
- `DJANGO_ALLOWED_HOSTS` → el host de Render
- `DATABASE_URL` → connection string completa de Neon con `?sslmode=require`
- `FRONTEND_URL` → URL del frontend en Vercel (se agrega a `CORS_ALLOWED_ORIGINS`)

El entrypoint corre `python manage.py collectstatic --noinput` antes de gunicorn. **Whitenoise** sirve los estáticos del admin de Django.

### Frontend (Vercel)

| Configuración | Valor |
| --- | --- |
| Root Directory | `frontend/orbiflow` |
| Build Command | `npm run build` (definido en `vercel.json`) |
| Output Directory | `dist/orbiflow/browser` (definido en `vercel.json`) |
| Production Branch | `main` |
| Preview Branches | resto (incluye `develop`) |

El archivo [`frontend/orbiflow/vercel.json`](../frontend/orbiflow/vercel.json) define rewrites SPA (`/*` → `/index.html`) para que Angular Router funcione en hard refresh.

#### Configuraciones de Angular y qué backend usa cada una

| Modo | Archivo de env Angular | URL del backend |
| --- | --- | --- |
| `development` (default de `ng serve`) | `environment.ts` | `http://localhost:8000/api` |
| `sandbox` (default de `ng build`) | `environment.sandbox.ts` | `orbiflow-backend-sandbox.onrender.com/api` |
| `production` | `environment.production.ts` | `orbiflow-backend-prod.onrender.com/api` |

Vercel preview de `develop` usa `sandbox` (default). Cuando se quiera promover a producción real con `orbiflow-backend-prod`, hay dos opciones:

1. Cambiar `defaultConfiguration` en `angular.json` a `"production"`.
2. En el dashboard de Vercel, setear el build command de la Production Branch a `npm run build -- --configuration=production`.

---

## 15. Workflow de git

1. **Sincronizar develop**

   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Crear rama**

   ```bash
   git checkout -b feat/nombre-tarea
   ```

3. **Desarrollar + testear**

   - Cambios en el código.
   - `make tests` → si rompe algo, **no avanzar**.

4. **Commit + merge develop + push**

   ```bash
   git add .
   git commit -m "feat: descripción corta"
   git merge develop          # traer cambios recientes
   make tests                 # última verificación
   git push origin feat/nombre-tarea
   ```

5. **Pull Request** hacia `develop`. Esperar que el check de GitHub Actions se ponga en verde antes de mergear.

6. **Limpieza local**

   ```bash
   git checkout develop
   git pull origin develop
   git branch -d feat/nombre-tarea
   ```

Pattern de mensaje de commit (estilo del repo):

- `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `chore: ...`
