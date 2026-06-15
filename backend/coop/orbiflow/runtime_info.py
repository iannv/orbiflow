import os
import sys


def _optional_env(*keys: str) -> str | None:
    for key in keys:
        value = os.getenv(key, "").strip()
        if value:
            return value
    return None


def is_render_deploy() -> bool:
    return _optional_env("RENDER", "RENDER_SERVICE_NAME", "RENDER_EXTERNAL_HOSTNAME") is not None


def git_branch() -> str | None:
    return _optional_env("RENDER_GIT_BRANCH", "GIT_BRANCH")


def backend_label() -> str:
    service = _optional_env("RENDER_SERVICE_NAME", "BACKEND_SERVICE")
    if service:
        return service

    if not is_render_deploy():
        return "localhost:8000"

    external_host = _optional_env("RENDER_EXTERNAL_HOSTNAME")
    if external_host:
        return external_host

    allowed_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "")
    first_host = allowed_hosts.split(",")[0].strip()
    return first_host or "unknown"


def runtime_info(*, status: str) -> dict:
    return {
        "status": status,
        "git_branch": git_branch(),
        "backend": backend_label(),
    }


def log_runtime_info() -> None:
    if "test" in sys.argv:
        return

    try:
        payload = runtime_info(status="starting")
        print(f"[OrbiFlow] Entorno {payload}", flush=True)
    except Exception as exc:
        print(f"[OrbiFlow] No se pudo loguear el entorno: {exc}", flush=True)
