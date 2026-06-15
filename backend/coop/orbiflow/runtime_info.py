import os
import sys


def _first_env(*keys: str) -> str:
    for key in keys:
        value = os.getenv(key, "").strip()
        if value:
            return value
    return ""


def _neon_branch_from_django_env() -> str:
    django_env = os.getenv("DJANGO_ENV", "local")
    return {
        "local": "local",
        "sandbox": "develop",
        "production": "main",
    }.get(django_env, django_env)


def is_render_deploy() -> bool:
    return _first_env("RENDER", "RENDER_SERVICE_NAME", "RENDER_EXTERNAL_HOSTNAME") != ""


def deployment() -> str:
    return "render" if is_render_deploy() else "local"


def git_branch() -> str:
    # Solo el deploy en Render conoce la rama de GitHub; en Docker local no aplica.
    return _first_env("RENDER_GIT_BRANCH", "GIT_BRANCH") or "local"


def neon_branch() -> str:
    return _first_env("NEON_BRANCH") or _neon_branch_from_django_env()


def backend_label() -> str:
    service = _first_env("RENDER_SERVICE_NAME", "BACKEND_SERVICE")
    if service:
        return service

    if not is_render_deploy():
        return "localhost:8000"

    external_host = _first_env("RENDER_EXTERNAL_HOSTNAME")
    if external_host:
        return external_host

    allowed_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "")
    first_host = allowed_hosts.split(",")[0].strip()
    return first_host or "unknown"


def runtime_info(*, status: str, database: str) -> dict:
    return {
        "status": status,
        "database": database,
        "deployment": deployment(),
        "git_branch": git_branch(),
        "backend": backend_label(),
        "neon_branch": neon_branch(),
    }


def log_runtime_info() -> None:
    if "test" in sys.argv:
        return

    try:
        payload = runtime_info(status="starting", database="unknown")
        print(f"[OrbiFlow] Entorno {payload}", flush=True)
    except Exception as exc:
        print(f"[OrbiFlow] No se pudo loguear el entorno: {exc}", flush=True)
