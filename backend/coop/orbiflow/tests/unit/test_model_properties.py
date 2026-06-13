"""
Tests unitarios de propiedades de modelos y del manager de usuarios.

No pasan por la API: ejercitan directamente la lógica de los modelos
(`Associate` y el `UserManager` de `User`).

    * Associate: full_name, work_email, is_active, years_in_coop.
    * UserManager: inferencia de membresía y rol por defecto.
"""
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from orbiflow.models.identity import User, Associate


class AssociateModelPropertyTests(TestCase):
    """Propiedades derivadas del Associate (calculadas desde su User/fecha)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='prop_user',
            email='prop_user@coop.test',
            password='secret12345',
            first_name='Carla',
            last_name='Giménez',
            role='associate',
        )
        self.associate = Associate.objects.create(
            user=self.user,
            dni='50000001',
            cbu='0000000000000000000050',
            entry_date=date(2020, 1, 1),
            personal_email='carla.personal@coop.test',
            phone_number='222',
            address='Calle 5',
        )

    def test_full_name_combines_user_first_and_last_name(self):
        self.assertEqual(self.associate.full_name, 'Carla Giménez')

    def test_work_email_returns_user_email(self):
        self.assertEqual(self.associate.work_email, 'prop_user@coop.test')

    def test_is_active_reflects_user_active_flag(self):
        self.assertTrue(self.associate.is_active)

        self.user.is_active = False
        self.user.save()
        self.assertFalse(self.associate.is_active)

    def test_years_in_coop_counts_full_years_since_entry(self):
        """years_in_coop = (hoy - entry_date).days // 365."""
        self.associate.entry_date = timezone.now().date() - timedelta(days=800)
        self.associate.save()
        # 800 // 365 = 2 años cumplidos.
        self.assertEqual(self.associate.years_in_coop, 2)

    def test_years_in_coop_is_zero_for_recent_entry(self):
        self.associate.entry_date = timezone.now().date() - timedelta(days=10)
        self.associate.save()
        self.assertEqual(self.associate.years_in_coop, 0)


class UserManagerTests(TestCase):
    """Comportamiento del UserManager al crear usuarios y superusuarios."""

    def test_create_user_associate_is_coop_member_by_default(self):
        user = User.objects.create_user(
            username='socio_mgr', email='socio_mgr@coop.test',
            password='x', role='associate',
        )
        self.assertTrue(user.is_coop_member)

    def test_create_user_admin_is_not_coop_member_by_default(self):
        user = User.objects.create_user(
            username='admin_mgr', email='admin_mgr@coop.test',
            password='x', role='admin',
        )
        self.assertFalse(user.is_coop_member)

    def test_create_superuser_defaults_to_admin_role(self):
        superuser = User.objects.create_superuser(
            username='super_mgr', email='super_mgr@coop.test', password='x',
        )
        self.assertEqual(superuser.role, 'admin')
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
