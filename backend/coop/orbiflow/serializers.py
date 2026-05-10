# orbiflow/serializers.py
from rest_framework import serializers
from .models.identity import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']