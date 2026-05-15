from django.db import connection, transaction
from django.http import JsonResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models.identity import User, Associate
from .models.audit import GlobalConfiguration, AuditLog
from .models.core import LiquidationPeriod, RetirementDetail
from .models.rules import Module, Variant, AssociateVariant
from .serializers import (
    AssociateSerializer, UserSerializer, GlobalConfigurationSerializer,
    ModuleSerializer, VariantSerializer, AssociateVariantSerializer,
    LiquidationPeriodSerializer, RetirementDetailSerializer,
    BulkHoursSerializer, CalculateLiquidationSerializer,
)
from .services.liquidation import LiquidationCalculator


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
    filterset_fields = ['id', 'role', 'username', 'email']


class AssociateViewSet(viewsets.ModelViewSet):
    """
    Controlador para la gestión de asociados.

    """
    queryset = Associate.objects.filter(is_deleted=False).select_related('user')
    serializer_class = AssociateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'dni', 'cbu']


class AssociateVariantViewSet(viewsets.ModelViewSet):
    """
    API para gestionar el legajo: asignar o quitar variantes a los asociados.

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
    """

    queryset = Variant.objects.all()
    serializer_class = VariantSerializer
    filterset_fields = ['module', 'type', 'is_default']


class LiquidationPeriodViewSet(viewsets.ModelViewSet):
    """
    CRUD de Periodos de Liquidación + acciones del Motor de Liquidación.

    Acciones extra:
      * POST  /api/liquidations/{id}/upload-hours/  -> carga masiva de horas.
      * POST  /api/liquidations/{id}/calculate/     -> ejecuta el motor.
      * GET   /api/liquidations/{id}/summary/       -> resumen con totales.
      * GET   /api/liquidations/{id}/retirements/   -> recibos persistidos.
    """
    queryset = LiquidationPeriod.objects.all().order_by('-year', '-month')
    serializer_class = LiquidationPeriodSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['year', 'month', 'status']

    @action(detail=True, methods=['post'], url_path='upload-hours')
    def upload_hours(self, request, pk=None):
        """
        Recibe un JSON masivo `{"entries": [{"associate_id": x, "hours_worked": h}, ...]}`
        y crea/actualiza un RetirementDetail (con montos en cero) por asociado
        para este periodo, listo para que el motor de liquidación lo procese.
        """
        period = self.get_object()
        if period.status == 'closed':
            return Response(
                {"error": "El periodo está cerrado, no se pueden cargar horas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BulkHoursSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entries = serializer.validated_data['entries']
        associate_ids = [e['associate_id'] for e in entries]
        existing_ids = set(
            Associate.objects
            .filter(id__in=associate_ids, is_deleted=False)
            .values_list('id', flat=True)
        )
        missing = [aid for aid in associate_ids if aid not in existing_ids]
        if missing:
            return Response(
                {"error": "Algunos asociados no existen o están eliminados.",
                 "missing_associate_ids": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = 0
        updated = 0
        with transaction.atomic():
            for entry in entries:
                _, was_created = RetirementDetail.objects.update_or_create(
                    liquidation=period,
                    associate_id=entry['associate_id'],
                    defaults={'hours_worked': entry['hours_worked']},
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        return Response(
            {
                "period_id": period.id,
                "received": len(entries),
                "created": created,
                "updated": updated,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='calculate')
    def calculate(self, request, pk=None):
        """
        Ejecuta el motor de liquidación.

        Body:
            {"test_mode": true}   -> Dry-run, devuelve desglose sin tocar la DB.
            {"test_mode": false}  -> Persiste RetirementDetail + LiquidationItem.
        """
        period = self.get_object()
        if period.status == 'closed':
            return Response(
                {"error": "El periodo está cerrado, no puede recalcularse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params_serializer = CalculateLiquidationSerializer(data=request.data)
        params_serializer.is_valid(raise_exception=True)
        test_mode = params_serializer.validated_data['test_mode']

        if not RetirementDetail.objects.filter(liquidation=period).exists():
            return Response(
                {"error": "No hay horas cargadas para este periodo. "
                          "Llama a /upload-hours/ primero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        calculator = LiquidationCalculator(period)
        result = calculator.run(test_mode=test_mode)

        if not test_mode:
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action="RUN_LIQUIDATION_ENGINE",
                previous_data={"period_id": period.id},
                new_data={
                    "period_id": period.id,
                    "retirements_count": result['retirements_count'],
                    "totals": result['totals'],
                },
            )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        """Devuelve totales del periodo y la lista resumida de recibos."""
        period = self.get_object()
        retirements = (
            RetirementDetail.objects
            .filter(liquidation=period)
            .select_related('associate', 'associate__user')
            .prefetch_related('items')
        )

        totals = {
            'base_amount': sum((r.base_amount for r in retirements), 0),
            'additional_amount': sum((r.additional_amount for r in retirements), 0),
            'cap_adjustment': sum((r.cap_adjustment for r in retirements), 0),
            'total_amount': sum((r.total_amount for r in retirements), 0),
        }

        return Response({
            'period': LiquidationPeriodSerializer(period).data,
            'retirements_count': retirements.count(),
            'totals': {k: str(v) for k, v in totals.items()},
            'retirements': RetirementDetailSerializer(retirements, many=True).data,
        })

    @action(detail=True, methods=['get'], url_path='retirements')
    def retirements(self, request, pk=None):
        """Lista de recibos persistidos del periodo (sin recalcular)."""
        period = self.get_object()
        retirements = (
            RetirementDetail.objects
            .filter(liquidation=period)
            .select_related('associate', 'associate__user')
            .prefetch_related('items')
        )
        return Response(RetirementDetailSerializer(retirements, many=True).data)


class RetirementDetailViewSet(mixins.ListModelMixin,
                              mixins.RetrieveModelMixin,
                              viewsets.GenericViewSet):
    """
    Consulta de recibos individuales.
    Solo lectura: la creación se hace a través del motor de liquidación.
    """
    queryset = (
        RetirementDetail.objects.all()
        .select_related('associate', 'associate__user', 'liquidation')
        .prefetch_related('items')
    )
    serializer_class = RetirementDetailSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['liquidation', 'associate']