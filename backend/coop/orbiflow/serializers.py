# orbiflow/serializers.py
from .models.identity import Associate, User
from .models.audit import GlobalConfiguration, AuditLog
from .models.rules import AssociateVariant, Variant, Module

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
    class Meta:
        model = Variant
        fields = ['id', 'module', 'name', 'type', 'value', 'is_default']
        extra_kwargs = {'module': {'required': False}}

class ModuleSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, required=False)

    class Meta:
        model = Module
        fields = ['id', 'name', 'description', 'applies_to_cap', 'calculation_type', 'is_exclusive', 'is_active', 'variants']

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        module = Module.objects.create(**validated_data)
        for variant_data in variants_data:
            Variant.objects.create(module=module, **variant_data)
        return module