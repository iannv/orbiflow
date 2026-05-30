# OrbiFlow

Sistema integral de gestión para **cooperativas de trabajo**. Permite gestionar asociados, calcular liquidaciones de retiros mensuales y aplicar reglas de negocio dinámicas (módulos, variantes, topes, antigüedad) con trazabilidad completa y soberanía tecnológica.

---

## ¿Qué hace OrbiFlow?

Una cooperativa de trabajo paga mensualmente un **retiro** (su versión del salario) a cada asociado. El monto no es fijo: depende de las horas trabajadas, del valor hora vigente, de adicionales propios de la cooperativa (presentismo, antigüedad, viáticos, etc.) y de un tope porcentual sobre el retiro base.

Cada cooperativa define sus propias reglas y necesita poder ajustarlas en el tiempo **sin romper la trazabilidad** de liquidaciones pasadas (auditorías, reclamos, ajustes retroactivos).

OrbiFlow modela ese dominio con piezas configurables:

| Pieza | Para qué sirve |
| --- | --- |
| **Módulo** | Concepto liquidable (Presentismo, Antigüedad, Viáticos…). Define cómo se calcula (`simple` o `seniority`) y si entra al tope. |
| **Variante** | Opción concreta dentro de un módulo (porcentaje vs. monto fijo, con un valor). |
| **AssociateVariant** | Asignación: qué variante de qué módulo le aplica a cada asociado. |
| **GlobalConfiguration** | Valor hora y tope (%) vigentes. Cada cambio queda versionado. |
| **LiquidationPeriod** | Cabecera del mes liquidado. **Congela** el valor hora y el tope vigentes — si después cambia la configuración, los recibos viejos no se mueven. |
| **RetirementDetail + LiquidationItem** | El recibo de cada asociado y su desglose línea por línea. |

---

## Motor de liquidación

Para cada asociado y cada período mensual, OrbiFlow aplica esta fórmula:

```
RetiroBase     = horas_trabajadas * valor_hora_del_periodo
Adicionales    = Σ items_calculados (presentismo, antigüedad, viáticos, ...)
TopeMaximo     = RetiroBase * cap_pct_del_periodo / 100
CapAdjustment  = max(0, Σ items_topeables − TopeMaximo)
Total          = RetiroBase + Adicionales − CapAdjustment
```

Cada ítem de **Adicionales** se calcula según el tipo de módulo (`simple` o `seniority`) y el tipo de variante (`percentage` o `fixed_amount`). El detalle de las cuatro combinaciones, el cálculo exacto de la antigüedad y el manejo de `Decimal`/`ROUND_HALF_UP` están en [`docs/TECHNICAL.md` § Motor de liquidación](./docs/TECHNICAL.md#8-motor-de-liquidación).

### Flujo de un mes

```
1. Configurar valor hora y tope               POST /api/config/
2. Definir módulos y variantes                POST /api/modules/  + POST /api/variants/
3. Asignar variantes al asociado              POST /api/associate-variants/
4. Crear el período (congela valor hora/tope) POST /api/liquidations/
5. Cargar horas trabajadas (bulk)             POST /api/liquidations/{id}/upload-hours/
6. Dry-run del cálculo                        POST /api/liquidations/{id}/calculate/  test_mode=true
7. Ejecución definitiva (persiste recibos)    POST /api/liquidations/{id}/calculate/  test_mode=false
8. Resumen y recibos                          GET  /api/liquidations/{id}/summary/
                                              GET  /api/retirements/
```

El dry-run del paso 6 devuelve el desglose completo en JSON sin tocar la base — sirve para revisar todo antes de impactar los recibos.

---

## Demo en vivo (entorno Sandbox)

| | URL |
| --- | --- |
| **Frontend (UI Angular)** | <https://orbiflow-git-develop-orbicoop.vercel.app> |
| **Backend (Django admin)** | <https://orbiflow-backend-sandbox.onrender.com/admin/> |
| **API docs (Swagger)** | <https://orbiflow-backend-sandbox.onrender.com/api/docs/> |
| **Healthcheck** | <https://orbiflow-backend-sandbox.onrender.com/api/health/> |

### Usuarios de prueba (sólo sandbox-solicitar passwords a los desarrolladores)

| Rol | Usuario | Password |
| --- | --- | --- |
| Superadmin | `superadmin` | `*****` |
| Admin | `admin` | `*****` |
| Tesorero | `treasurer` | `*****` |
| Asociado | `associate` | `*****` |

> Estas credenciales son **sólo para el entorno sandbox** (Neon branch develop). No se usan en producción.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Django 6 · DRF · drf-spectacular · SimpleJWT |
| Frontend | Angular 21 · RxJS |
| Base de datos | PostgreSQL 16 (Docker local · Neon en la nube) |
| Containerización | Docker · docker compose |
| CI | GitHub Actions |
| Hosting backend | Render (con whitenoise para estáticos) |
| Hosting frontend | Vercel |
| Reverse proxy / static | Whitenoise (en el mismo proceso de gunicorn) |

---

## Arquitectura

```
┌──────────────────┐    HTTPS   ┌──────────────────┐    SQL (TLS)   ┌────────────┐
│   Vercel         │ ─────────▶ │   Render         │ ─────────────▶ │   Neon     │
│   (Angular SPA)  │            │   (Django/DRF)   │                │ (Postgres) │
│ orbiflow.vercel  │            │ orbiflow-backend │                │  sandbox / │
│ .app             │            │ .onrender.com    │                │  prod      │
└──────────────────┘            └──────────────────┘                └────────────┘
        ▲                                ▲
        │ npm run build                  │ gunicorn + whitenoise
        │                                │
        └──────────── git push ──────────┘
                    (develop = sandbox)
                    (main    = production, todavía sin promover)
```

En desarrollo local todo corre en Docker (backend + frontend + Postgres), y un solo flag elige a qué base apuntar.

---

## Quickstart (local)

Necesitás Docker, docker compose y make.

> **¿Windows?** Antes de seguir, leé las [Notas para usuarios de Windows](#notas-para-usuarios-de-windows) más abajo — `make` no viene instalado y hay un detalle con los saltos de línea que conviene resolver primero.

```bash
git clone git@github.com:iannv/orbiflow.git
cd orbiflow

# Crear los .env (ver docs/TECHNICAL.md → "Variables de entorno")
# Mínimo: .env.local

make build-local
```

Una vez levantado:

- Frontend → <http://localhost:4200>
- Admin de Django → <http://localhost:8000/admin> (creá el usuario con `make superuser`)
- API docs → <http://localhost:8000/api/docs/>

Para cambiar a qué base apunta el backend sin perder el entorno local de Docker:

```bash
make build-sandbox   # apunta a Neon Sandbox
make build-prod      # apunta a Neon Producción
```

Todos los comandos disponibles: `make help`.

### Notas para usuarios de Windows

Antes de levantar el proyecto desde Windows, dos cosas a resolver:

**1. Instalar `make` (opcional, pero recomendado).**

`make` no viene con Windows. Hay varias opciones, dejamos una que nos funcionó:

- En **PowerShell como administrador** correr `winget install ezwinports.make`, reiniciar la consola y usar los comandos con normalidad.
- **Sin instalar nada**: usar `docker compose` directo. Por ejemplo, `docker compose --profile local up --build -d` equivale a `make build-local`. Los equivalentes de cada comando del Makefile están en [`docs/TECHNICAL.md`](./docs/TECHNICAL.md#3-comandos-del-makefile).

**2. Saltos de línea CRLF en archivos `.sh`.**

Por defecto, git en Windows convierte los archivos shell a CRLF (`\r\n`) y bash dentro del contenedor Linux no los entiende. Vas a ver un error parecido a:

```
exec /docker-entrypoint.sh: no such file or directory
# o bien
/bin/sh^M: bad interpreter: No such file or directory
```

Para evitarlo agregamos un `.gitattributes` que fuerza a git a mantener los saltos de línea como LF (`\n`) en los archivos `.sh`:

Si el archivo `backend/coop/docker-entrypoint.sh` **ya** te quedó con CRLF, abrilo en VS Code / Cursor → click en `CRLF` (esquina inferior derecha de la barra de estado) → elegir `LF` → guardar → `docker compose down` → volver a intentar el build.

---

## Documentación

| Archivo | Para qué |
| --- | --- |
| [`docs/TECHNICAL.md`](./docs/TECHNICAL.md) | Setup detallado, Makefile, tests, migraciones, motor de liquidación, modelo de datos, roles, deploy, pgAdmin. |
| [`LICENSE`](./LICENSE) | Términos AGPLv3. |

## Licencia

Distribuido bajo **GNU Affero General Public License v3.0 (AGPLv3)**. Garantiza que el código se mantenga libre y abierto, incluso si se ofrece como servicio. Ver [`LICENSE`](./LICENSE).
