"""
Tests unitarios de la lógica de validación de los serializers.

Se instancian los serializers directamente y se valida con `is_valid()`,
sin pasar por la API REST. Cubren reglas de negocio que viven en los
serializers (no en los endpoints):

    * UserSerializer: inferencia y validación de `is_coop_member` según el rol.
    * LiquidationPeriodSerializer: rangos válidos de mes y año.
"""
from django.test import TestCase

from orbiflow.serializers import UserSerializer, LiquidationPeriodSerializer


class UserSerializerValidationTests(TestCase):
    """Reglas de membresía a la cooperativa según el rol."""

    def _base_payload(self, **overrides):
        data = {
            'username': 'nuevo_socio',
            'email': 'nuevo_socio@coop.test',
            'password': 'secret12345',
        }
        data.update(overrides)
        return data

    def test_associate_infers_coop_membership(self):
        """Un asociado sin `is_coop_member` explícito se infiere como miembro."""
        serializer = UserSerializer(data=self._base_payload(role='associate'))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertTrue(serializer.validated_data['is_coop_member'])

    def test_treasurer_infers_coop_membership(self):
        """El tesorero también es miembro por inferencia."""
        serializer = UserSerializer(data=self._base_payload(role='treasurer'))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertTrue(serializer.validated_data['is_coop_member'])

    def test_admin_defaults_to_non_member(self):
        """Un admin no se asume miembro de la cooperativa."""
        serializer = UserSerializer(data=self._base_payload(role='admin'))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertFalse(serializer.validated_data['is_coop_member'])

    def test_associate_cannot_opt_out_of_membership(self):
        """Un asociado no puede declararse no-miembro: debe fallar la validación."""
        serializer = UserSerializer(
            data=self._base_payload(role='associate', is_coop_member=False)
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_coop_member', serializer.errors)


class LiquidationPeriodSerializerValidationTests(TestCase):
    """Validación de rangos de mes y año del período."""

    def test_accepts_valid_month_and_year(self):
        serializer = LiquidationPeriodSerializer(data={'month': 6, 'year': 2025})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_month_out_of_range(self):
        serializer = LiquidationPeriodSerializer(data={'month': 13, 'year': 2025})
        self.assertFalse(serializer.is_valid())
        self.assertIn('month', serializer.errors)

    def test_rejects_month_zero(self):
        serializer = LiquidationPeriodSerializer(data={'month': 0, 'year': 2025})
        self.assertFalse(serializer.is_valid())
        self.assertIn('month', serializer.errors)

    def test_rejects_year_below_range(self):
        serializer = LiquidationPeriodSerializer(data={'month': 6, 'year': 1899})
        self.assertFalse(serializer.is_valid())
        self.assertIn('year', serializer.errors)

    def test_rejects_year_above_range(self):
        serializer = LiquidationPeriodSerializer(data={'month': 6, 'year': 3000})
        self.assertFalse(serializer.is_valid())
        self.assertIn('year', serializer.errors)
