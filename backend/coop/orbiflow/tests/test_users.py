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
            "role": "associate",
            "is_coop_member": True,
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

    def test_list_users_filter_by_role(self):
        User.objects.create_user(
            username='socio', password='x', email='s@s.com', role='associate',
            is_coop_member=True,
        )
        admins = self.client.get(self.url, {'role': 'admin'})
        self.assertTrue(all(u['role'] == 'admin' for u in admins.data))

    def test_user_payload_exposes_is_coop_member_not_is_staff(self):
        """El contrato API debe exponer `is_coop_member` y NO `is_staff`."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        sample = response.data[0]
        self.assertIn('is_coop_member', sample)
        self.assertNotIn('is_staff', sample)

    def test_create_associate_requires_is_coop_member_true(self):
        """Un usuario `associate` debe ser miembro de la cooperativa."""
        data = {
            "username": "socio_no_miembro",
            "password": "Secreto123",
            "email": "socio_no_miembro@orbiflow.coop",
            "role": "associate",
            "is_coop_member": False,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('is_coop_member', response.data)

    def test_create_treasurer_requires_is_coop_member_true(self):
        """Un usuario `treasurer` debe ser miembro de la cooperativa."""
        data = {
            "username": "tesorero_no_miembro",
            "password": "Secreto123",
            "email": "tesorero_no_miembro@orbiflow.coop",
            "role": "treasurer",
            "is_coop_member": False,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('is_coop_member', response.data)

    def test_create_associate_without_is_coop_member_defaults_to_true(self):
        """Si el cliente omite el campo, associate/treasurer deben quedar como miembros."""
        data = {
            "username": "socio_sin_flag",
            "password": "Secreto123",
            "email": "socio_sin_flag@orbiflow.coop",
            "role": "associate",
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_coop_member'])

        user = User.objects.get(username='socio_sin_flag')
        self.assertTrue(user.is_coop_member)

    def test_create_associate_with_null_is_coop_member_does_not_break_db(self):
        data = {
            "username": "socio_null_flag",
            "password": "Secreto123",
            "email": "socio_null_flag@orbiflow.coop",
            "role": "associate",
            "is_coop_member": None,
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.get(username='socio_null_flag').is_coop_member)

    def test_create_admin_can_be_non_member(self):
        """Un usuario `admin` puede no ser miembro de la cooperativa."""
        data = {
            "username": "admin_externo",
            "password": "Secreto123",
            "email": "admin_externo@orbiflow.coop",
            "role": "admin",
            "is_coop_member": False,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_coop_member'])
        self.assertEqual(response.data['role'], 'admin')