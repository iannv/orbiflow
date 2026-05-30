from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status

from ..models.identity import User, Associate
from ..models.core import LiquidationPeriod, RetirementDetail


class PermissionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_user', password='adminpw', email='admin@a.com',
            role='admin', is_superuser=True,
        )
        self.treasurer = User.objects.create_user(
            username='treasurer_user', password='treapw', email='treas@a.com',
            role='treasurer', is_coop_member=True,
        )
        self.associate = User.objects.create_user(
            username='associate_user', password='assocpw', email='assoc@a.com',
            role='associate', is_coop_member=True,
        )

        self.associate_profile = Associate.objects.create(
            user=self.associate,
            dni='11111111',
            cbu='0' * 22,
            entry_date=timezone.now().date(),
            base_hours=8,
            personal_email='assoc_personal@a.com',
            phone_number='123456',
            address='Calle Falsa 123',
            emergency_contact={'name': 'Pepe', 'phone': '555-555', 'relation': 'amigo'},
        )

        self.period = LiquidationPeriod.objects.create(
            month=1, year=2026,
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00')
        )
        self.retirement = RetirementDetail.objects.create(
            liquidation=self.period,
            associate=self.associate_profile,
            hours_worked=160,
            base_amount=Decimal('16000.00'),
            additional_amount=Decimal('0.00'),
            total_amount=Decimal('16000.00'),
        )

    def get_token(self, username, password):
        resp = self.client.post(
            reverse('token_obtain_pair'),
            {'username': username, 'password': password},
            format='json',
        )
        return resp.data.get('access')

    def authenticate_associate(self):
        access = self.get_token('associate_user', 'assocpw')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_associate_can_view_liquidations_and_retirements_but_not_modules(self):
        self.authenticate_associate()

        self.assertEqual(
            self.client.get(reverse('liquidation-list')).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get(reverse('retirement-list')).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get(reverse('module-list')).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        calc_url = reverse('liquidation-calculate', kwargs={'pk': self.period.id})
        self.assertEqual(
            self.client.post(calc_url, {'test_mode': True}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_associate_can_list_users_and_associates_but_not_edit(self):
        self.authenticate_associate()

        user_list = self.client.get(reverse('user-list'))
        self.assertEqual(user_list.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(user_list.data), 1)

        associate_list = self.client.get(reverse('associate-list'))
        self.assertEqual(associate_list.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(associate_list.data), 1)

        self.assertEqual(
            self.client.post(
                reverse('user-list'),
                {
                    'username': 'nuevo',
                    'password': 'Secreto123',
                    'email': 'nuevo@orbiflow.coop',
                    'role': 'associate',
                    'is_coop_member': True,
                },
                format='json',
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_associate_can_retrieve_only_own_user_and_associate_detail(self):
        other_user = User.objects.create_user(
            username='associate_other',
            password='assocpw2',
            email='assoc2@a.com',
            role='associate',
            is_coop_member=True,
        )
        other_profile = Associate.objects.create(
            user=other_user,
            dni='22222222',
            cbu='1' * 22,
            entry_date=timezone.now().date(),
            base_hours=8,
            personal_email='assoc_other_personal@a.com',
            phone_number='999999',
            address='Otra calle 456',
            emergency_contact={'name': 'Ana', 'phone': '444-444', 'relation': 'hermana'},
        )

        self.authenticate_associate()

        own_user = self.client.get(reverse('user-detail', kwargs={'pk': self.associate.id}))
        self.assertEqual(own_user.status_code, status.HTTP_200_OK)
        self.assertEqual(own_user.data['id'], self.associate.id)

        other_user_resp = self.client.get(reverse('user-detail', kwargs={'pk': other_user.id}))
        self.assertEqual(other_user_resp.status_code, status.HTTP_403_FORBIDDEN)

        own_associate = self.client.get(
            reverse('associate-detail', kwargs={'pk': self.associate_profile.id})
        )
        self.assertEqual(own_associate.status_code, status.HTTP_200_OK)
        self.assertEqual(own_associate.data['id'], self.associate_profile.id)

        other_associate = self.client.get(
            reverse('associate-detail', kwargs={'pk': other_profile.id})
        )
        self.assertEqual(other_associate.status_code, status.HTTP_403_FORBIDDEN)

    def test_associate_cannot_patch_or_put_users_even_with_superuser_flag(self):
        self.associate.is_superuser = True
        self.associate.save(update_fields=['is_superuser'])

        target = User.objects.create_user(
            username='patch_victim', password='pw', email='pv@a.com',
            role='admin',
        )

        self.authenticate_associate()

        patch_resp = self.client.patch(
            reverse('user-detail', kwargs={'pk': target.id}),
            {'first_name': 'Hacked'},
            format='json',
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

        put_resp = self.client.put(
            reverse('user-detail', kwargs={'pk': self.associate.id}),
            {
                'username': self.associate.username,
                'email': self.associate.email,
                'first_name': 'Self',
                'last_name': self.associate.last_name,
                'role': 'associate',
                'is_coop_member': True,
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(put_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_treasurer_cannot_delete_admin_but_can_delete_non_admin(self):
        target_admin = User.objects.create_user(
            username='victim_admin', password='pw', email='v@v.com', role='admin',
        )
        victim = User.objects.create_user(
            username='victim', password='pw', email='v2@v.com',
            role='associate', is_coop_member=True,
        )

        access = self.get_token('treasurer_user', 'treapw')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        resp = self.client.delete(reverse('user-detail', kwargs={'pk': target_admin.id}))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        resp = self.client.delete(reverse('user-detail', kwargs={'pk': victim.id}))
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK, status.HTTP_202_ACCEPTED))

    def test_admin_can_delete_any_user(self):
        target = User.objects.create_user(
            username='to_delete', password='pw', email='x@x.com',
            role='associate', is_coop_member=True,
        )
        access = self.get_token('admin_user', 'adminpw')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        resp = self.client.delete(reverse('user-detail', kwargs={'pk': target.id}))
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK, status.HTTP_202_ACCEPTED))
