"""
Reglas de negocio:
    * Al crear (o actualizar) una Variant con `is_default=True`, se debe asignar
      automáticamente a TODOS los asociados existentes (no eliminados).
    * Al crear un Módulo con variantes embebidas (POST /api/modules/ con
      `variants=[...]`), las variantes default se aplican a todos los asociados.
    * Al crear un Asociado, se asignan automáticamente todas las variantes
      `is_default=True` existentes.
    * Se respeta la exclusividad del módulo: si el asociado ya tiene una variante
      de un módulo exclusivo, NO se sobreescribe con la default (se respeta la
      elección manual).
    * Cuando el módulo es exclusivo y el asociado no tiene ninguna variante de
      ese módulo, la default se aplica.
"""
from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from orbiflow.models.identity import User, Associate
from orbiflow.models.rules import Module, Variant, AssociateVariant


class DefaultVariantPropagationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin_def', password='123', email='admin_def@test.com',
        )
        self.client.force_authenticate(user=self.admin)

        self.user_a = User.objects.create_user(
            username='socio_a', email='a@coop.test',
            first_name='Ana', last_name='Pérez',
        )
        self.assoc_a = Associate.objects.create(
            user=self.user_a, dni='30000001',
            cbu='0000000000000000000031',
            entry_date=date(2023, 1, 1),
            personal_email='ana@personal.com',
            phone_number='1', address='Calle A',
        )

        self.user_b = User.objects.create_user(
            username='socio_b', email='b@coop.test',
            first_name='Beto', last_name='Gomez',
        )
        self.assoc_b = Associate.objects.create(
            user=self.user_b, dni='30000002',
            cbu='0000000000000000000032',
            entry_date=date(2023, 1, 1),
            personal_email='beto@personal.com',
            phone_number='2', address='Calle B',
        )

    # --- Variant create / update ----------------------------------------- #

    def test_creating_default_variant_propagates_to_existing_associates(self):
        """
        POST /api/variants/ con is_default=True debe crear un AssociateVariant
        por cada Associate existente (no eliminado).
        """
        module = Module.objects.create(
            name='Presentismo Auto', calculation_type='simple', is_exclusive=True,
        )
        url = reverse('variant-list')
        payload = {
            'module': module.id,
            'name': 'Completo',
            'type': 'percentage',
            'value': '10.00',
            'is_default': True,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        variant_id = response.data['id']
        self.assertTrue(
            AssociateVariant.objects.filter(
                associate=self.assoc_a, variant_id=variant_id,
            ).exists()
        )
        self.assertTrue(
            AssociateVariant.objects.filter(
                associate=self.assoc_b, variant_id=variant_id,
            ).exists()
        )

    def test_creating_non_default_variant_does_not_propagate(self):
        """Una variant con is_default=False NO se asigna automáticamente."""
        module = Module.objects.create(
            name='Viáticos Auto', calculation_type='simple', is_exclusive=True,
        )
        url = reverse('variant-list')
        payload = {
            'module': module.id, 'name': 'X',
            'type': 'fixed_amount', 'value': '5000.00',
            'is_default': False,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        variant_id = response.data['id']
        self.assertFalse(
            AssociateVariant.objects.filter(variant_id=variant_id).exists()
        )

    def test_updating_variant_to_default_propagates(self):
        """
        Si se marca como default una variante ya existente (PATCH), se asigna a
        todos los asociados que aún no la tengan.
        """
        module = Module.objects.create(
            name='Bono Manual', calculation_type='simple', is_exclusive=False,
        )
        variant = Variant.objects.create(
            module=module, name='Bono', type='fixed_amount',
            value=Decimal('1000.00'), is_default=False,
        )
        self.assertEqual(AssociateVariant.objects.filter(variant=variant).count(), 0)

        url = reverse('variant-detail', kwargs={'pk': variant.id})
        response = self.client.patch(url, {'is_default': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            AssociateVariant.objects.filter(variant=variant).count(),
            2,
        )

    # --- Exclusividad ---------------------------------------------------- #

    def test_default_variant_respects_existing_choice_on_exclusive_module(self):
        """
        Si un asociado ya tiene asignada una variante de un módulo exclusivo, la
        nueva default NO debe sobreescribir su elección manual.
        """
        module = Module.objects.create(
            name='Seniority Exclusivo', calculation_type='simple', is_exclusive=True,
        )
        chosen = Variant.objects.create(
            module=module, name='Senior', type='percentage',
            value=Decimal('10.00'), is_default=False,
        )
        AssociateVariant.objects.create(associate=self.assoc_a, variant=chosen)

        url = reverse('variant-list')
        payload = {
            'module': module.id, 'name': 'Junior',
            'type': 'percentage', 'value': '2.00',
            'is_default': True,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_variant_id = response.data['id']

        a_variants = AssociateVariant.objects.filter(
            associate=self.assoc_a, variant__module=module,
        )
        self.assertEqual(a_variants.count(), 1)
        self.assertEqual(a_variants.first().variant_id, chosen.id)

        self.assertTrue(
            AssociateVariant.objects.filter(
                associate=self.assoc_b, variant_id=new_variant_id,
            ).exists()
        )

    # --- Módulo con variantes embebidas ---------------------------------- #

    def test_creating_module_with_default_variant_propagates(self):
        """POST /api/modules/ con `variants=[{is_default:true,...}]` propaga."""
        url = reverse('module-list')
        payload = {
            'name': 'Presentismo Embebido',
            'calculation_type': 'simple',
            'is_exclusive': True,
            'applies_to_cap': True,
            'variants': [
                {'name': 'Completo', 'type': 'percentage',
                 'value': '10.00', 'is_default': True},
                {'name': 'Medio', 'type': 'percentage',
                 'value': '5.00', 'is_default': False},
            ],
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        default_variant = Variant.objects.get(
            module_id=response.data['id'], name='Completo',
        )
        non_default = Variant.objects.get(
            module_id=response.data['id'], name='Medio',
        )

        self.assertEqual(
            AssociateVariant.objects.filter(variant=default_variant).count(),
            2,
        )
        self.assertEqual(
            AssociateVariant.objects.filter(variant=non_default).count(),
            0,
        )

    def test_bulk_modules_endpoint_propagates_defaults(self):
        """POST /api/modules/bulk/ también propaga las variantes default."""
        url = reverse('module-bulk-upload')
        payload = [
            {
                'name': 'Antigüedad Bulk',
                'calculation_type': 'seniority',
                'is_exclusive': True,
                'applies_to_cap': False,
                'variants': [
                    {'name': '1% año', 'type': 'percentage',
                     'value': '1.00', 'is_default': True},
                ],
            },
        ]
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        variant = Variant.objects.get(name='1% año')
        self.assertEqual(
            AssociateVariant.objects.filter(variant=variant).count(), 2,
        )

    # --- Alta de asociado ------------------------------------------------ #

    def test_new_associate_receives_default_variants(self):
        """
        Al crear un Asociado, se asignan automáticamente todas las variantes
        existentes con `is_default=True`.
        """
        m1 = Module.objects.create(name='Mod1', is_exclusive=True)
        v1 = Variant.objects.create(
            module=m1, name='V1', type='fixed_amount',
            value=Decimal('100.00'), is_default=True,
        )

        m2 = Module.objects.create(name='Mod2', is_exclusive=False)
        v2_default = Variant.objects.create(
            module=m2, name='V2D', type='percentage',
            value=Decimal('5.00'), is_default=True,
        )
        v2_other = Variant.objects.create(
            module=m2, name='V2O', type='percentage',
            value=Decimal('1.00'), is_default=False,
        )

        new_user = User.objects.create_user(
            username='nuevo', email='nuevo@coop.test',
            first_name='Nuevo', last_name='Socio',
        )
        url = reverse('associate-list')
        payload = {
            'user': new_user.id,
            'dni': '40000099',
            'cbu': '0000000000000000000099',
            'entry_date': '2024-05-01',
            'personal_email': 'nuevo@personal.com',
            'phone_number': '999', 'address': 'Calle nueva',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_associate_id = response.data['id']
        assigned = AssociateVariant.objects.filter(
            associate_id=new_associate_id,
        ).values_list('variant_id', flat=True)
        self.assertIn(v1.id, assigned)
        self.assertIn(v2_default.id, assigned)
        self.assertNotIn(v2_other.id, assigned)
