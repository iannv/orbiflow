from django.db import connection
from django.http import JsonResponse


def healthcheck(_request):
    try:
        connection.ensure_connection()
    except Exception:
        return JsonResponse(
            {"status": "error", "database": "unavailable"},
            status=503,
        )

    return JsonResponse({"status": "ok", "database": "connected"})
