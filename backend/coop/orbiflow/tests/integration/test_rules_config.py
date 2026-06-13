from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from orbiflow.models.identity import User
from orbiflow.models.audit import GlobalConfiguration, AuditLog
from orbiflow.models.rules import Module, Variant

class RulesAndConfigTests(APITestCase):
    def setUp(self):
        # Setup de usuario admin
        self.admin = User.objects.create_superuser(username='admin', password='123', email='a@a.com')
        response = self.client.post(reverse('token_obtain_pair'), {'username': 'admin', 'password': '123'})
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        
        # URLS
        self.config_url = reverse('config-list')
        self.module_url = reverse('module-list')

    def test_create_config_generates_audit_log(self):
        """
        Verifica que al crear una configuración se registre el historial y el log.
        """
        # 1. Crear configuración inicial
        data_1 = {"hour_value": "5000.00", "cap_percentage": "30.00"}
        self.client.post(self.config_url, data_1)
        
        # 2. Actualizar a nuevo valor
        data_2 = {"hour_value": "6000.00", "cap_percentage": "25.00"}
        response = self.client.post(self.config_url, data_2)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 3. Verificar AuditLog
        log = AuditLog.objects.filter(action="UPDATE_GLOBAL_CONFIG").last()
        self.assertIsNotNone(log)
        self.assertEqual(log.new_data['hour_value'], "6000.00")
        self.assertEqual(log.previous_data['hour_value'], "5000.00")
        self.assertEqual(log.user, self.admin)

    def test_module_with_variants_creation(self):
        """
        Verifica el CRUD de módulos y la integridad de sus variantes.
        """
        # Crear Módulo
        module_data = {
            "name": "Presentismo",
            "description": "Bono por asistencia",
            "is_exclusive": True
        }
        res_mod = self.client.post(self.module_url, module_data)
        module_id = res_mod.data['id']
        
        # Crear Variante vinculada
        variant_url = reverse('variant-list')
        variant_data = {
            "module": module_id,
            "name": "Completo",
            "type": "percentage",
            "value": "10.00"
        }
        res_var = self.client.post(variant_url, variant_data)
        
        self.assertEqual(res_var.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Module.objects.count(), 1)
        self.assertEqual(Variant.objects.get(id=res_var.data['id']).module.name, "Presentismo")

    def test_config_history_ordering(self):
        """Verifica que el historial de configuración devuelva primero lo más reciente."""
        GlobalConfiguration.objects.create(hour_value=1000, user=self.admin)
        GlobalConfiguration.objects.create(hour_value=2000, user=self.admin)
        
        response = self.client.get(self.config_url)
        self.assertEqual(float(response.data[0]['hour_value']), 2000.00)