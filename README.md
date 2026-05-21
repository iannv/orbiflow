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
⚙️ Configuración de Entornos

Para trabajar con OrbiFlow, debes crear tres archivos de configuración en la raíz del proyecto. No subas estos archivos a GitHub (están ignorados por .gitignore).

Crea los archivos .env.local, .env.sandbox y .env.prod con la siguiente estructura básica y completa los valores correspondientes:
1. Entorno Local (.env.local)

Para desarrollo offline con base de datos en Docker.
Fragmento de código
```
POSTGRES_DB=orbiflow_db
POSTGRES_USER=admin
POSTGRES_PASSWORD="tu_password_local"
POSTGRES_HOST=db
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=dev-key
DJANGO_DEBUG=true
```

2. Entorno Sandbox (.env.sandbox)

Para pruebas en la nube (Neon) en fase de desarrollo.
Fragmento de código
```
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD="tu_password_sandbox"
POSTGRES_HOST=tu_host_sandbox.neon.tech
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=tu_clave_secreta
DJANGO_DEBUG=true
```
3. Entorno Producción (.env.prod)

Para el despliegue final en la nube (Neon).
Fragmento de código
```
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD="tu_password_prod"
POSTGRES_HOST=tu_host_prod.neon.tech
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=tu_clave_secreta_segura
DJANGO_DEBUG=false
```
🛠️ Ejecución del ProyectoEl proyecto utiliza un Makefile para automatizar la configuración. Según el entorno donde desees trabajar, utiliza uno de los siguientes comandos:

| Objetivo | Comando | Descripción |
|----------|---------|-------------|
| Desarrollo Local | `make build-local` | Levanta el backend, frontend y una base de datos local. |
| Desarrollo Nube (Sandbox) | `make build-sandbox` | Levanta backend y frontend conectados a Neon (Sandbox). |
| Producción | `make build-prod` | Levanta backend y frontend conectados a Neon (Prod). |

*Nota: Los comandos build reconstruyen las imágenes de Docker. Si solo necesitas levantar los servicios ya construidos, usa make up-local, make up-sandbox o make up-prod.*

## Gestión de la Aplicación

Una vez que los contenedores estén corriendo, crear el superusuario para acceder al panel de Django:

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
1. Abrir el frontend en el navegador:
  - `http://localhost:4200`
  - Deberías ver la página de inicio de Orbiflow sin errores.
2. Correr los tests
  ```bash
   make tests
  ```

## Arquitectura Técnica del Motor de Liquidación

OrbiFlow desacopla la **definición de las reglas** (módulos y variantes) de la
**ejecución del cálculo** (motor de liquidación). El flujo completo, desde la
configuración hasta la obtención del recibo, es el siguiente:

### 1. Modelo de datos (resumen)


| Entidad               | Rol                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `User` / `Associate`  | Usuario del sistema y legajo del socio.                                                                                                   |
| `Module`              | Concepto de liquidación (Presentismo, Antigüedad, Viáticos, etc.). Define `calculation_type` (`simple` / `seniority`) y `applies_to_cap`. |
| `Variant`             | Opción dentro de un módulo (`fixed_amount` o `percentage`).                                                                               |
| `AssociateVariant`    | Tabla intermedia que asigna variantes al legajo del socio.                                                                                |
| `GlobalConfiguration` | Histórico de Valor Hora y Tope (%) vigentes. Cada cambio queda auditado.                                                                  |
| `LiquidationPeriod`   | Cabecera del mes liquidado. Congela `applied_hour_value` y `applied_cap_pct`.                                                             |
| `RetirementDetail`    | Recibo de un asociado en un periodo. Persiste base, adicionales, `**cap_adjustment`** y total.                                            |
| `LiquidationItem`     | Línea de detalle (un ítem por variante aplicada).                                                                                         |
| `AuditLog`            | Bitácora de acciones críticas (cambios de configuración, ejecución del motor).                                                            |


### 2. Componente de cálculo

La fórmula aplicada es:

```
RetiroBase     = horas_trabajadas * applied_hour_value
Adicionales    = Σ items_calculados
TopeMaximo     = RetiroBase * applied_cap_pct / 100
CapAdjustment  = max(0, Σ items_aplicables_al_tope − TopeMaximo)
Total          = RetiroBase + Adicionales − CapAdjustment
```

Cada item se calcula según el par `calculation_type` (Módulo) × `type` (Variante):


| `calculation_type` | `type`         | Fórmula                       | Notas                                        |
| ------------------ | -------------- | ----------------------------- | -------------------------------------------- |
| `simple`           | `percentage`   | `base * value / 100`          | Bono fijo en porcentaje del retiro base.     |
| `simple`           | `fixed_amount` | `value`                       | Suma directa al adicional.                   |
| `seniority`        | `percentage`   | `base * (value / 100) * años` | Ej. 1% por año, 3 años = 3% del retiro base. |
| `seniority`        | `fixed_amount` | `value * años`                | Ej. $3.000 por año, 3 años = $9.000.         |


Los **años de antigüedad** se calculan desde `Associate.entry_date` hasta el
último día del mes del periodo (`calendar.monthrange`), por lo que un
aniversario que cae dentro del mes liquidado ya cuenta.

Todos los montos se manejan como `Decimal` y se cuantizan a 2 decimales con
`ROUND_HALF_UP` 

### 3. Validación de Topes

Sólo los módulos marcados con `applies_to_cap=True` cuentan para el tope. Si su
suma supera `TopeMaximo`, el excedente se descuenta del **total** del recibo y
se persiste en `RetirementDetail.cap_adjustment`, manteniendo intacta la
trazabilidad de cada `LiquidationItem` (que conserva su valor original).

### 4. Flujo de extremo a extremo

```text
┌────────────────────────────┐
│ 1. Login (JWT)             │  POST /api/auth/login/
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 2. Configuración global     │  POST /api/config/
│    (valor hora + tope %)    │
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 3. Módulos y variantes      │  Típico (UI): POST /api/modules/  + POST /api/variants/
│                             │  Alternativa: POST /api/modules/bulk/
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 4. Alta de Asociados        │  POST /api/users/  +  POST /api/associates/
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 5. Asignar variantes al     │  POST /api/associate-variants/
│    legajo                   │
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 6. Crear periodo de         │  POST /api/liquidations/
│    liquidación              │
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 7. Cargar horas trabajadas  │  POST /api/liquidations/{id}/upload-hours/
│    (JSON masivo)            │  body: {"entries":[{"associate_id":1,"hours_worked":160}]}
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 8a. Dry-run del motor       │  POST /api/liquidations/{id}/calculate/
│     (test_mode=true)        │  → devuelve desglose sin persistir
└────────────┬───────────────┘
             │  (revisión OK)
┌────────────▼───────────────┐
│ 8b. Ejecución definitiva    │  POST /api/liquidations/{id}/calculate/
│     (test_mode=false)       │  → persiste RetirementDetail + LiquidationItem
└────────────┬───────────────┘
             │
┌────────────▼───────────────┐
│ 9. Resumen / Recibos        │  GET /api/liquidations/{id}/summary/
│                             │  GET /api/retirements/?liquidation={id}
└────────────────────────────┘
```

## Colecciones Postman 

En `backend/postman/` se incluyen:
1) Un archivo de variables de entorno
2) Una colección lista para importar que recorre el camino feliz completo.
  Importala desde Postman y ejecutá las requests en orden — las variables `base_url`, `access_token`, `associate_id`, `period_id`, `module`_* se pueblan solas con los scripts de test de cada request.
3) Una colección con todos los endpoints para pruebas puntuales.

## Motor de Liquidación (cómo funciona OrbiFlow)

OrbiFlow se apoya en un **motor de liquidación parametrizable** que recorre, para cada periodo mensual, las reglas configuradas y produce un recibo (`RetirementDetail`) por asociado con su desglose línea por línea (`LiquidationItem`).

### Flujo completo: de las reglas al recibo

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│ 1. Configuración │ -> │ 2. Definición    │ -> │ 3. Asignación al     │
│    Global        │    │    de Módulos    │    │    Asociado          │
│  - Valor hora    │    │  - Tipo simple/  │    │  - AssociateVariant  │
│  - Tope (%)      │    │    seniority     │    │                      │
└──────────────────┘    │  - applies_to_cap│    └──────────────────────┘
                        │  - Variantes     │              │
                        └──────────────────┘              ▼
                                                ┌──────────────────────┐
                                                │ 4. Periodo de        │
                                                │    Liquidación       │
                                                │  - mes / año         │
                                                │  - hour_value        │
                                                │  - cap_pct           │
                                                └──────────────────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────────┐
                                                │ 5. Carga de horas    │
                                                │    (bulk JSON)       │
                                                └──────────────────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────────┐
                                                │ 6. /calculate/       │
                                                │  test_mode=true ─→ JSON dry-run│
                                                │  test_mode=false ─→ persiste   │
                                                └──────────────────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────────┐
                                                │ 7. Resumen / Recibo  │
                                                │    /summary/         │
                                                │    /retirements/{id} │
                                                └──────────────────────┘
```

La definición de módulos y variantes puede hacerse **de a uno** desde la UI (`POST /api/modules/` con `variants` opcionales, o `POST /api/variants/`) o en **lote** con `POST /api/modules/bulk/` cuando convenga.

### Reglas de cálculo

1. **Retiro Base** = `hours_worked` × `applied_hour_value` (vigentes al periodo).
2. **Adicionales por módulo** (todas las variantes activas asignadas al asociado):

  | Módulo (`calculation_type`) | Variante (`type`) | Fórmula                                  |
  | --------------------------- | ----------------- | ---------------------------------------- |
  | `simple`                    | `percentage`      | `base * value / 100`                     |
  | `simple`                    | `fixed_amount`    | `value`                                  |
  | `seniority`                 | `percentage`      | `base * (value / 100) * años_antigüedad` |
  | `seniority`                 | `fixed_amount`    | `value * años_antigüedad`                |

   *Antigüedad:* años cumplidos desde `Associate.entry_date` hasta el **último día del mes** del periodo (no hasta "hoy").
3. **Validación de Topes**: se suman únicamente los items de módulos con `applies_to_cap=True`. Si exceden `applied_cap_pct` del Retiro Base, el excedente se descuenta y se persiste en el campo `RetirementDetail.cap_adjustment` para mantener trazabilidad. Los items se conservan con su valor calculado original.
4. **Total** = `base_amount + additional_amount − cap_adjustment` (siempre con 2 decimales).




## Documentación de la API

La documentación de la API se genera automáticamente con drf-spectacular. 

### Rutas de Acceso

Una vez que el servidor esté corriendo, puedes acceder a:

- **Swagger UI (Interactiva):** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **Redoc (Estática):** [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **Esquema OpenAPI:** [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

### Cómo probar los endpoints protegidos

La mayoría de los endpoints requieren autenticación mediante JWT:

1. Obtené un `access_token` en `/api/auth/login/`.
2. En Swagger UI, haz clic en el botón **"Authorize"** (arriba a la derecha).
3. Ingresa el token con el formato: `Bearer <tu_token_aqui>`.
4. Haz clic en **"Authorize"** y ya puedes ejecutar peticiones con "Try it out".

## Desarrollo y modelos de datos

Si realizás cambios en los archivos `models.py`, seguí este flujo:

1. **Generar migración:** `make makemigrations`
2. **Aplicar cambios:** `make migrate`
3. **Pushear cambios:** Asegurate de incluir el archivo de migración generado en tu commit.

## 💡 Comandos Rápidos (Makefile)

Para facilitar el desarrollo, usamos un `Makefile`. Podés ejecutar estos comandos desde la raíz:


| Tarea                             | Comando               |
| --------------------------------- | --------------------- |
| **Levantar proyecto**             | `make up`             |
| **Reconstruir y levantar**        | `make build`          |
| **Correr todos los tests**        | `make tests`          |
| **Generar migraciones**           | `make makemigrations` |
| **Aplicar migraciones**           | `make migrate`        |
| **Crear administrador**           | `make superuser`      |
| **Ver logs del backend**          | `make logs`           |
| **Detener contenedores**          | `make down`           |
| **Limpiar base de datos**         | `make clean`          |
| **Entrar a la terminal de la DB** | `make db-shell`       |
| **Entrar al shell de Django**     | `make shell`          |


## Flujo de trabajo recomendado

1. **Sincronizar**
  ```bash
   git checkout develop
   git pull origin develop
  ```
2. **Nueva Rama**
  ```bash
   git checkout -b feat/nombre-tarea
  ```
3. **Desarrollar y Testear**
  - Realizar cambios en el código
  - Correr tests locales: `make tests`
  - No avanzar si los tests fallan
4. **Subir Cambios**
  ```bash
   git add .
   git commit -m "feat: descripción"
   git merge develop
   make tests  # última verificación antes de subir
   git push origin feat/nombre-tarea
  ```
5. **Pull Request (PR)**
  - Abrir PR en GitHub hacia la rama `develop`
  - Esperar a que el check test (GitHub Action) se ponga en verde
  - Hacer clic en "Merge pull request"
  - Si ya no se necesita la rama, eliminarla desde GitHub
6. **Limpieza Local**
  ```bash
   git checkout develop
   git pull origin develop
   git branch -d feat/nombre-tarea
  ```



## 📊 Generación Automática de Diagramas de Clases

El proyecto incluye `django-extensions` y `Graphviz` preconfigurados dentro del entorno de Docker para mapear visualmente la arquitectura de la base de datos de forma automatizada.

Para generar o actualizar el diagrama de entidades exclusivo de la lógica core de la cooperativa, ejecutá el siguiente comando desde la raíz del proyecto:

```bash
make data-diagram
```