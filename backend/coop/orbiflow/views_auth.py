# orbiflow/views_auth.py
from django.contrib.auth.models import update_last_login
from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models.identity import User
from .serializers import UserSerializer


class OrbiflowTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(required=False, write_only=True)

    """
    SimpleJWT no ejecuta django.contrib.auth.login(); actualizamos last_login aqui.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False

    def validate(self, attrs):
        identifier = attrs.get('email') or attrs.get(self.username_field)

        if not identifier:
            raise serializers.ValidationError({
                'email': 'Debe ingresar un email.'
            })

        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier),
            is_deleted=False,
        ).first()

        if user:
            if not user.is_active:
                raise PermissionDenied('Cuenta deshabilitada.')

            attrs[self.username_field] = getattr(user, self.username_field)

        data = super().validate(attrs)
        update_last_login(sender=self.user.__class__, user=self.user)
        data['user'] = UserSerializer(self.user).data
        return data


class OrbiflowTokenObtainPairView(TokenObtainPairView):
    serializer_class = OrbiflowTokenObtainPairSerializer


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
