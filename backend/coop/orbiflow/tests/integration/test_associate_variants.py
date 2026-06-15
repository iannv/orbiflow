from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from orbiflow.models.identity import User, Associate
from orbiflow.models.rules import Module, Variant, AssociateVariant
from django.utils import timezone
from datetime import date, timedelta

class AssociateVariantTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin_test', password='password123', role='admin')
        self.client.force_authenticate(user=self.user)
        
        # Asociado con 2 años de antigüedad para probar el tipo 'seniority'
        two_years_ago = timezone.now().date() - timedelta(days=730)
        self.associate = Associate.objects.create(
            user=self.user,
            dni='12345678',
            cbu='0123456789012345678901',
            entry_date=two_years_ago #
        )

    def test_calculation_type_simple_validation(self):
        """Valida la creación y asignación de un módulo con tipo de cálculo 'simple'."""
        module_simple = Module.objects.create(
            name="Presentismo", 
            calculation_type='simple', #
            is_exclusive=True
        )
        variant = Variant.objects.create(
            module=module_simple, 
            name="Monto Fijo", 
            type='fixed_amount', 
            value=1000.00
        )
        
        url = reverse('associatevariant-list')
        data = {"associate": self.associate.id, "variant": variant.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(module_simple.calculation_type, 'simple') 

    def test_calculation_type_seniority_validation(self):
        """Valida la configuración de un módulo tipo 'seniority'."""
        module_seniority = Module.objects.create(
            name="Plus por Antigüedad", 
            calculation_type='seniority', #
            is_exclusive=True
        )
        variant = Variant.objects.create(
            module=module_seniority, 
            name="1% por año", 
            type='percentage', 
            value=1.00
        )
        # Verificamos que el asociado tiene la antigüedad calculada correctamente
        self.assertEqual(self.associate.years_in_coop, 2)
        
        # Validamos que el tipo de cálculo quedó correctamente persistido en el módulo
        self.assertEqual(module_seniority.calculation_type, 'seniority')

        # Asignamos la variante al legajo
        url = reverse('associatevariant-list')
        data = {"associate": self.associate.id, "variant": variant.id}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_exclusive_module_replacement(self):
        """Mantiene la lógica de reemplazo para módulos exclusivos."""
        module = Module.objects.create(name="Exclusivo", is_exclusive=True)
        v1 = Variant.objects.create(module=module, name="V1", type='fixed_amount', value=10)
        v2 = Variant.objects.create(module=module, name="V2", type='fixed_amount', value=20)
        
        AssociateVariant.objects.create(associate=self.associate, variant=v1)
        
        url = reverse('associatevariant-list')
        self.client.post(url, {"associate": self.associate.id, "variant": v2.id}, format='json')
        
        self.assertEqual(AssociateVariant.objects.filter(associate=self.associate).count(), 1)
        self.assertEqual(AssociateVariant.objects.get(associate=self.associate).variant, v2)