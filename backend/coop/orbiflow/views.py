from django.db import connection
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .serializers import AssociateSerializer, UserSerializer
from .models.identity import User, Associate


def healthcheck(_request):
    try:
        connection.ensure_connection()
    except Exception:
        return JsonResponse(
            {"status": "error", "database": "unavailable"},
            status=503,
        )

    return JsonResponse({"status": "ok", "database": "connected"})


 
class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de usuarios del sistema.
    """
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

class AssociateViewSet(viewsets.ModelViewSet):
    """
    Controlador para la gestión de asociados.
    Maneja automáticamente el listado y las operaciones de detalle.
    """
    serializer_class = AssociateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filtramos para no mostrar asociados marcados como eliminados
        return Associate.objects.filter(is_deleted=False).select_related('user')
