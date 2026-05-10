from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from ..models.identity import User, Associate

class AssociateTests(APITestCase):
    def setUp(self):
        # Usuario para autenticación
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            password='password123',
            email='admin@test.com'
        )
        # Obtenemos el token
        response = self.client.post(reverse('token_obtain_pair'), {
            'username': 'admin_test',
            'password': 'password123'
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        
        # Usuario para el perfil de asociado
        self.assoc_user = User.objects.create_user(
            username='socio1',
            first_name='Gonzalo',
            last_name='Villalba',
            email='gonzalo@orbiflow.coop'
        )
        
        self.url = reverse('associate-list')

    def test_list_associates(self):
        """Verifica que se listen los asociados correctamente."""
        Associate.objects.create(
            user=self.assoc_user,
            dni='12345678',
            cbu='0000000000000000000001',
            entry_date='2024-01-01',
            personal_email='gonzalo@personal.com'
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['first_name'], 'Gonzalo')
        self.assertEqual(response.data[0]['work_email'], 'gonzalo@orbiflow.coop')

    def test_create_associate_missing_data(self):
        """Verifica que falle si faltan campos obligatorios."""
        response = self.client.post(self.url, {'dni': '111'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)