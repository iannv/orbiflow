from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from ..models.identity import User

class UserTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(username='admin', password='123', email='a@a.com')
        response = self.client.post(reverse('token_obtain_pair'), {'username': 'admin', 'password': '123'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.url = reverse('user-list')

    def test_create_user_hashes_password(self):
        """Verifica que al crear un usuario la contraseña no quede en texto plano."""
        data = {
            "username": "nuevo_socio",
            "password": "secreto_total",
            "email": "nuevo@orbiflow.coop",
            "role": "associate"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        user = User.objects.get(username="nuevo_socio")
        self.assertNotEqual(user.password, "secreto_total")
        self.assertTrue(user.check_password("secreto_total"))

    def test_list_users_hides_passwords(self):
        """Verifica que el JSON de respuesta no incluya el campo password."""
        response = self.client.get(self.url)
        self.assertNotIn('password', response.data[0])