# orbiflow/serializers.py
from .models.identity import Associate, User

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
class AssociateSerializer(serializers.ModelSerializer):
    first_name = serializers.ReadOnlyField()
    last_name = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    work_email = serializers.ReadOnlyField()
    years_in_coop = serializers.ReadOnlyField()

    class Meta:
        model = Associate
        fields = [
            'id', 'user', 'dni', 'cbu', 'entry_date', 
            'base_hours', 'work_email', 'personal_email', 
            'phone_number', 'address', 'emergency_contact',
            'first_name', 'last_name', 'full_name', 'years_in_coop',
            'is_deleted'
        ]
        read_only_fields = ['is_deleted']