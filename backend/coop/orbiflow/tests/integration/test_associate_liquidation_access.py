from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from orbiflow.models.core import LiquidationPeriod
from orbiflow.models.identity import Associate, User


class AssociateLiquidationAccessTests(APITestCase):
    def setUp(self):
        self.associate_user = User.objects.create_user(
            username='assoc_access',
            password='assocpw',
            email='assoc_access@a.com',
            role='associate',
            is_coop_member=True,
        )
        self.associate_profile = Associate.objects.create(
            user=self.associate_user,
            dni='33333333',
            cbu='2' * 22,
            entry_date=date(2024, 6, 15),
            base_hours=8,
            personal_email='assoc_access_personal@a.com',
            phone_number='123456',
            address='Calle 123',
            emergency_contact={'name': 'Pepe', 'phone': '555', 'relation': 'amigo'},
        )

        self.before_entry = LiquidationPeriod.objects.create(
            month=5,
            year=2024,
            status='closed',
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00'),
        )
        self.entry_month = LiquidationPeriod.objects.create(
            month=6,
            year=2024,
            status='closed',
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00'),
        )
        self.after_entry = LiquidationPeriod.objects.create(
            month=7,
            year=2024,
            status='closed',
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00'),
        )
        self.open_period = LiquidationPeriod.objects.create(
            month=8,
            year=2024,
            status='open',
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00'),
        )

        access = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'assoc_access', 'password': 'assocpw'},
            format='json',
        ).data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_associate_lists_only_closed_periods_from_entry_month(self):
        response = self.client.get(reverse('liquidation-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids = {item['id'] for item in response.data}
        self.assertNotIn(self.before_entry.id, ids)
        self.assertIn(self.entry_month.id, ids)
        self.assertIn(self.after_entry.id, ids)
        self.assertNotIn(self.open_period.id, ids)

    def test_associate_cannot_access_summary_before_entry_month(self):
        url = reverse('liquidation-summary', kwargs={'pk': self.before_entry.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_associate_can_access_summary_from_entry_month(self):
        url = reverse('liquidation-summary', kwargs={'pk': self.entry_month.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_sees_all_periods_including_open(self):
        User.objects.create_superuser(
            username='admin_access',
            password='adminpw',
            email='admin_access@a.com',
            role='admin',
        )
        access = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin_access', 'password': 'adminpw'},
            format='json',
        ).data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get(reverse('liquidation-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 4)
