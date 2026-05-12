from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status

User = get_user_model()

class AuthenticationTests(APITestCase):
    def setUp(self):
        self.username = "testuser"
        self.password = "testpass123"
        self.user = User.objects.create_user(
            username=self.username, 
            password=self.password,
            email="test@orbiflow.coop"
        )
        self.login_url = reverse("token_obtain_pair")
        self.me_url = reverse("auth_me")
        self.refresh_url = reverse("token_refresh")

    def test_login_success_returns_tokens(self):
        """Verifica que un login exitoso devuelva los tokens access y refresh."""
        data = {
            "email": "test@orbiflow.coop",
            "password": self.password
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "associate")

    def test_login_updates_last_login(self):
        """El login JWT debe actualizar last_login (SimpleJWT no llama a auth.login())."""
        self.assertIsNone(self.user.last_login)
        self.client.post(
            self.login_url,
            {"email": "test@orbiflow.coop", "password": self.password},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)

    def test_login_fail_invalid_credentials(self):
        """Verifica que credenciales incorrectas devuelvan 401."""
        data = {
            "email": "test@orbiflow.coop",
            "password": "wrongpassword"
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_current_user_info_with_token(self):
        """Verifica que se puedan obtener los datos del usuario usando el access token."""
        # Primero obtenemos el token
        login_data = {"email": "test@orbiflow.coop", "password": self.password}
        login_response = self.client.post(self.login_url, login_data, format='json')
        access_token = login_response.data["access"]

        # Intentamos acceder al endpoint /me/ con el header de Authorization
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.username)
        self.assertEqual(response.data["email"], "test@orbiflow.coop")

    def test_access_me_without_token_fails(self):
        """Verifica que el endpoint /me/ esté protegido."""
        # Limpiamos cualquier credencial previa
        self.client.credentials()
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Verifica que el refresh token funcione para obtener un nuevo access token."""
        login_data = {"email": "test@orbiflow.coop", "password": self.password}
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data["refresh"]

        refresh_data = {"refresh": refresh_token}
        response = self.client.post(self.refresh_url, refresh_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_inactive_user_cannot_login(self):
        """Verifica que una cuenta inactiva no pueda iniciar sesión."""
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            self.login_url,
            {"email": "test@orbiflow.coop", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
