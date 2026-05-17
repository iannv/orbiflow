# orbiflow/serializers.py
from .models.identity import Associate, User
from .models.audit import GlobalConfiguration, AuditLog
from .models.rules import AssociateVariant, Variant, Module
from .models.core import LiquidationPeriod, RetirementDetail, LiquidationItem
from .services.defaults import (
    apply_default_variant_to_associates,
    apply_default_variants_to_associate,
)

from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'is_staff']
        extra_kwargs = {
            'password': {'write_only': True} # La contraseña no se muestra al consultar
        }

    def create(self, validated_data):
        # Usamos create_user para que Django encripte la contraseña automáticamente
        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        # Si se actualiza la contraseña, la encriptamos antes de guardar
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)
class AssociateVariantSerializer(serializers.ModelSerializer):
    """
    Serializador para asignar una variante específica a un asociado.
    para DELETE en /api/associate-variants/{id} usar el id del AssociateVariant, no del Variant.
    """
    variant_name = serializers.ReadOnlyField(source='variant.name')
    module_name = serializers.ReadOnlyField(source='variant.module.name')

    class Meta:
        model = AssociateVariant
        fields = [
            'id',
            'associate',
            'variant',
            'variant_name',
            'module_name',
            'activation_date',
        ]

class AssociateSerializer(serializers.ModelSerializer):
    first_name = serializers.ReadOnlyField()
    last_name = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    work_email = serializers.ReadOnlyField()
    years_in_coop = serializers.ReadOnlyField()
    
    variants = AssociateVariantSerializer(source='associatevariant_set', many=True, read_only=True)

    class Meta:
        model = Associate
        fields = [
            'id', 'user', 'dni', 'cbu', 'entry_date', 
            'base_hours', 'work_email', 'personal_email', 
            'phone_number', 'address', 'emergency_contact',
            'first_name', 'last_name', 'full_name', 'years_in_coop',
            'is_deleted', 'variants' 
        ]
        read_only_fields = ['is_deleted']

    def create(self, validated_data):
        associate = super().create(validated_data)
        apply_default_variants_to_associate(associate)
        return associate

# --- Configuración Global ---
class GlobalConfigurationSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = GlobalConfiguration
        fields = ['id', 'change_date', 'hour_value', 'cap_percentage', 'user', 'user_name']
        read_only_fields = ['user', 'change_date']

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

# --- Módulos Dinámicos ---

class VariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False) 

    class Meta:
        model = Variant
        fields = ['id', 'module', 'name', 'type', 'value', 'is_default']
        extra_kwargs = {'module': {'required': False}}

    def create(self, validated_data):
        variant = super().create(validated_data)
        from .services.defaults import apply_default_variant_to_associates
        apply_default_variant_to_associates(variant)
        return variant

    def update(self, instance, validated_data):
        previously_default = instance.is_default
        variant = super().update(instance, validated_data)
        from .services.defaults import apply_default_variant_to_associates
        if variant.is_default and not previously_default:
            apply_default_variant_to_associates(variant)
        return variant

class ModuleSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, required=False)

    class Meta:
        model = Module
        fields = ['id', 'name', 'description', 'applies_to_cap', 'calculation_type', 'is_exclusive', 'is_active', 'variants']

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        module = Module.objects.create(**validated_data)
        from .services.defaults import apply_default_variant_to_associates
        for variant_data in variants_data:
            variant = Variant.objects.create(module=module, **variant_data)
            apply_default_variant_to_associates(variant)
        return module

    # --- MÉTODO UPDATE PARA SOPORTAR EDICIÓN ANIDADA ---
    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)
        
        # 1. Actualizamos los campos propios del módulo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 2. Manejamos la lógica de las variantes si vinieron en el request
        if variants_data is not None:
            existing_variants = {v.id: v for v in instance.variants.all()}
            seen_ids = []

            for v_data in variants_data:
                variant_id = v_data.get('id')
                
                if variant_id and variant_id in existing_variants:
                    # Actualiza la variante existente
                    variant = existing_variants[variant_id]
                    previously_default = variant.is_default # Guardar estado anterior

                    for attr, value in v_data.items():
                        setattr(variant, attr, value)
                    variant.save()
                    seen_ids.append(variant.id)

                    if variant.is_default and not previously_default:
                        from .services.defaults import apply_default_variant_to_associates
                        apply_default_variant_to_associates(variant)
                    
                else:
                    # Crea una variante nueva agregada desde la edición
                    new_variant = Variant.objects.create(module=instance, **v_data)
                    seen_ids.append(new_variant.id)
                    from .services.defaults import apply_default_variant_to_associates
                    apply_default_variant_to_associates(new_variant)
            
            # 3. Elimina las variantes que el usuario quitó 
            for v_id, variant in existing_variants.items():
                if v_id not in seen_ids:
                    variant.delete()

        return instance


# --- Motor de Liquidación ---

class LiquidationPeriodSerializer(serializers.ModelSerializer):
    """CRUD de periodos de liquidación (mes/año, valor hora y tope vigentes)."""

    class Meta:
        model = LiquidationPeriod
        fields = [
            'id', 'month', 'year',
            'applied_hour_value', 'applied_cap_pct',
            'status',
        ]

    def validate_month(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("El mes debe estar entre 1 y 12.")
        return value

    def validate_year(self, value):
        if value < 2000 or value > 2100:
            raise serializers.ValidationError("Año fuera de rango razonable.")
        return value


class LiquidationItemSerializer(serializers.ModelSerializer):
    """Línea de detalle persistida de un recibo."""

    class Meta:
        model = LiquidationItem
        fields = ['id', 'module_name', 'calculated_value']


class RetirementDetailSerializer(serializers.ModelSerializer):
    """Cabecera del recibo de un asociado para un periodo dado."""
    associate_full_name = serializers.ReadOnlyField(source='associate.full_name')
    associate_dni = serializers.ReadOnlyField(source='associate.dni')
    items = LiquidationItemSerializer(many=True, read_only=True)

    class Meta:
        model = RetirementDetail
        fields = [
            'id', 'liquidation', 'associate',
            'associate_full_name', 'associate_dni',
            'hours_worked', 'base_amount', 'additional_amount',
            'cap_adjustment', 'total_amount', 'items',
        ]


class HoursEntrySerializer(serializers.Serializer):
    """Item individual del payload masivo de carga de horas."""
    associate_id = serializers.IntegerField(min_value=1)
    hours_worked = serializers.IntegerField(min_value=0)


class BulkHoursSerializer(serializers.Serializer):
    """
    Payload para `POST /api/liquidations/{id}/upload-hours/`.

    Ejemplo:
        {"entries": [{"associate_id": 1, "hours_worked": 160}, ...]}
    """
    entries = HoursEntrySerializer(many=True)

    def validate_entries(self, value):
        if not value:
            raise serializers.ValidationError("Debe enviarse al menos una entrada.")
        seen = set()
        for entry in value:
            associate_id = entry['associate_id']
            if associate_id in seen:
                raise serializers.ValidationError(
                    f"Asociado duplicado en el payload: id={associate_id}."
                )
            seen.add(associate_id)
        return value


class CalculateLiquidationSerializer(serializers.Serializer):
    """Payload para `POST /api/liquidations/{id}/calculate/`."""
    test_mode = serializers.BooleanField(default=True)
