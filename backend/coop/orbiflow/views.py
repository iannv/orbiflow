from django.db import connection, transaction
from django.http import JsonResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models.identity import User, Associate
from .models.audit import GlobalConfiguration, AuditLog
from .models.rules import Module, Variant, AssociateVariant
from .serializers import (
    AssociateSerializer, UserSerializer, GlobalConfigurationSerializer,
    ModuleSerializer, VariantSerializer, AssociateVariantSerializer
)

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

    Filtros disponibles vía query string (django-filter):
        ?id=, ?role=, ?username=, ?email=
    """
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['id', 'role', 'username', 'email']


class AssociateViewSet(viewsets.ModelViewSet):
    """
    Controlador para la gestión de asociados.

    Filtros disponibles vía query string (django-filter):
        ?user=<id>, ?dni=, ?cbu=
    """
    queryset = Associate.objects.filter(is_deleted=False).select_related('user')
    serializer_class = AssociateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'dni', 'cbu']


class AssociateVariantViewSet(viewsets.ModelViewSet):
    """
    API para gestionar el legajo: asignar o quitar variantes a los asociados.

    Filtros disponibles vía query string (django-filter):
        ?associate=<id>, ?variant=<id>
    """
    queryset = AssociateVariant.objects.all()
    serializer_class = AssociateVariantSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['associate', 'variant']

    def create(self, request, *args, **kwargs):
        # Lógica para evitar duplicados del mismo módulo si es exclusivo
        variant_id = request.data.get('variant')
        associate_id = request.data.get('associate')
        
        try:
            new_variant = Variant.objects.get(id=variant_id)
            if new_variant.module.is_exclusive:
                # Si el módulo es exclusivo, eliminamos variantes previas del mismo módulo para ese asociado
                AssociateVariant.objects.filter(
                    associate_id=associate_id, 
                    variant__module=new_variant.module
                ).delete()
        except Variant.DoesNotExist:
            return Response({"error": "Variante no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        return super().create(request, *args, **kwargs)


class GlobalConfigurationViewSet(mixins.ListModelMixin,
                                mixins.CreateModelMixin,
                                viewsets.GenericViewSet):
    """
    CRUD de configuración global. Solo Listar y Crear (Historial).

    Filtros disponibles vía query string (django-filter):
        ?user=<id>
    """
    queryset = GlobalConfiguration.objects.all().order_by('-change_date')
    serializer_class = GlobalConfigurationSerializer
    filterset_fields = ['user']

    def perform_create(self, serializer):
        previous_config = GlobalConfiguration.objects.order_by('-change_date').first()
        prev_data = {
            "hour_value": str(previous_config.hour_value),
            "cap_percentage": str(previous_config.cap_percentage)
        } if previous_config else {}

        instance = serializer.save(user=self.request.user)

        # Registramos en el AuditLog
        AuditLog.objects.create(
            user=self.request.user,
            action="UPDATE_GLOBAL_CONFIG",
            previous_data=prev_data,
            new_data={
                "hour_value": str(instance.hour_value),
                "cap_percentage": str(instance.cap_percentage)
            }
        )

class ModuleViewSet(viewsets.ModelViewSet):
    """
    CRUD de Módulos.

    Filtros disponibles vía query string:
        ?is_active=true|false, ?calculation_type=, ?is_exclusive=
    """
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    filterset_fields = ['is_active', 'calculation_type', 'is_exclusive']

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_upload(self, request):
        """
        Endpoint específico para carga masiva de módulos con variantes.
        URL: POST /api/modules/bulk/
        """
        # Validamos que recibimos una lista
        if not isinstance(request.data, list):
            return Response(
                {"error": "Se esperaba una lista de módulos."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Usamos una transacción atómica: si un módulo falla, no se carga nada
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class VariantViewSet(viewsets.ModelViewSet):
    """
    CRUD de Variantes.

    Filtros disponibles vía query string:
        ?module=<id>, ?type=, ?is_default=
    """

    queryset = Variant.objects.all()
    serializer_class = VariantSerializer
    filterset_fields = ['module', 'type', 'is_default']

