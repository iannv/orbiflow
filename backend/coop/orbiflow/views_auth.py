# orbiflow/views_auth.py
from django.contrib.auth.models import update_last_login
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import UserSerializer


class OrbiflowTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    SimpleJWT no ejecuta django.contrib.auth.login(); actualizamos last_login aquí.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        update_last_login(sender=self.user.__class__, user=self.user)
        return data


class OrbiflowTokenObtainPairView(TokenObtainPairView):
    serializer_class = OrbiflowTokenObtainPairSerializer


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)