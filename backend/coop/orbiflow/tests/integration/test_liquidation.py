"""
Tests de integración del Motor de Liquidación de OrbiFlow (vía API REST).

Cubre:
    * CRUD del periodo de liquidación y congelado de valor hora/tope.
    * Carga masiva de horas por endpoint.
    * Simulación en memoria (sin persistir).
    * Ejecución del motor (dry-run y definitivo) sobre los endpoints.
    * Flujo end-to-end completo del mes (camino feliz).

Las pruebas unitarias del servicio de cálculo viven en
`orbiflow/tests/unit/test_liquidation_engine.py`.
"""
from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from orbiflow.models.identity import User, Associate
from orbiflow.models.rules import Module, Variant, AssociateVariant
from orbiflow.models.audit import GlobalConfiguration, AuditLog
from orbiflow.models.core import LiquidationPeriod, RetirementDetail, LiquidationItem


class LiquidationAPITests(APITestCase):
    """Tests E2E sobre los endpoints del motor."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@coop.test', role='admin',
        )
        self.client.force_authenticate(user=self.admin)

        self.assoc_user = User.objects.create_user(
            username='socio1', email='s1@coop.test', first_name='Ana', last_name='Pérez',
        )
        self.associate = Associate.objects.create(
            user=self.assoc_user,
            dni='20000001',
            cbu='0000000000000000000020',
            entry_date=date(2023, 1, 1),
            personal_email='ana.personal@coop.test',
            phone_number='456',
            address='Calle 2',
        )
        self.period = LiquidationPeriod.objects.create(
            month=6, year=2025,
            applied_hour_value=Decimal('200.00'),
            applied_cap_pct=Decimal('30.00'),
        )

    def test_period_crud(self):
        GlobalConfiguration.objects.create(
            hour_value=Decimal('5000.00'),
            cap_percentage=Decimal('35.00'),
            user=self.admin,
        )
        url = reverse('liquidation-list')
        response = self.client.post(url, {
            'month': 7, 'year': 2025,
            'applied_hour_value': '250.00',
            'applied_cap_pct': '25.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['applied_hour_value'], '5000.00')
        self.assertEqual(response.data['applied_cap_pct'], '35.00')

        list_response = self.client.get(url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 2)

    def test_period_create_requires_global_config(self):
        url = reverse('liquidation-list')
        response = self.client.post(url, {
            'month': 8, 'year': 2025,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_period_year_must_match_frontend_range(self):
        GlobalConfiguration.objects.create(
            hour_value=Decimal('5000.00'),
            cap_percentage=Decimal('35.00'),
            user=self.admin,
        )
        url = reverse('liquidation-list')

        for valid_year in (1900, 1999, 2500, 2999):
            with self.subTest(year=valid_year):
                response = self.client.post(url, {
                    'month': 1,
                    'year': valid_year,
                }, format='json')
                self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
                LiquidationPeriod.objects.filter(month=1, year=valid_year).delete()

        for invalid_year in (1899, 3000):
            with self.subTest(year=invalid_year):
                response = self.client.post(url, {
                    'month': 1,
                    'year': invalid_year,
                }, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('year', response.data)

    def test_period_url_has_trailing_slash(self):
        list_response = self.client.get('/api/liquidations/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

    def test_upload_hours_creates_retirement_records(self):
        url = reverse('liquidation-upload-hours', kwargs={'pk': self.period.id})
        payload = {'entries': [
            {'associate_id': self.associate.id, 'hours_worked': 160},
        ]}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['updated'], 0)
        self.assertTrue(
            RetirementDetail.objects.filter(
                liquidation=self.period, associate=self.associate, hours_worked=160,
            ).exists()
        )

    def test_upload_hours_rejects_unknown_associate(self):
        url = reverse('liquidation-upload-hours', kwargs={'pk': self.period.id})
        payload = {'entries': [{'associate_id': 99999, 'hours_worked': 160}]}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_calculate_test_mode_does_not_persist(self):
        RetirementDetail.objects.create(
            liquidation=self.period, associate=self.associate, hours_worked=160,
        )
        url = reverse('liquidation-calculate', kwargs={'pk': self.period.id})
        response = self.client.post(url, {'test_mode': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['test_mode'])
        self.assertEqual(LiquidationItem.objects.count(), 0)

    def test_calculate_final_mode_persists(self):
        module = Module.objects.create(name='Presentismo', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='Completo', type='percentage', value=Decimal('10.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        RetirementDetail.objects.create(
            liquidation=self.period, associate=self.associate, hours_worked=160,
        )

        url = reverse('liquidation-calculate', kwargs={'pk': self.period.id})
        response = self.client.post(url, {'test_mode': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['test_mode'])

        retirement = RetirementDetail.objects.get(
            liquidation=self.period, associate=self.associate,
        )
        self.assertEqual(retirement.base_amount, Decimal('32000.00'))
        self.assertEqual(retirement.additional_amount, Decimal('3200.00'))
        self.assertEqual(retirement.total_amount, Decimal('35200.00'))
        self.assertEqual(retirement.items.count(), 1)

    def test_calculate_without_hours_returns_400(self):
        url = reverse('liquidation-calculate', kwargs={'pk': self.period.id})
        response = self.client.post(url, {'test_mode': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_summary_returns_totals(self):
        RetirementDetail.objects.create(
            liquidation=self.period, associate=self.associate,
            hours_worked=160, base_amount=Decimal('32000.00'),
            additional_amount=Decimal('3200.00'),
            total_amount=Decimal('35200.00'),
        )
        url = reverse('liquidation-summary', kwargs={'pk': self.period.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['retirements_count'], 1)
        self.assertEqual(response.data['totals']['total_amount'], '35200.00')

    def test_closed_period_blocks_upload_and_calculate(self):
        self.period.status = 'closed'
        self.period.save()

        upload_url = reverse('liquidation-upload-hours', kwargs={'pk': self.period.id})
        upload_response = self.client.post(upload_url, {
            'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]
        }, format='json')
        self.assertEqual(upload_response.status_code, status.HTTP_400_BAD_REQUEST)

        calc_url = reverse('liquidation-calculate', kwargs={'pk': self.period.id})
        calc_response = self.client.post(calc_url, {'test_mode': True}, format='json')
        self.assertEqual(calc_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviewed_period_can_revert_to_open(self):
        self.period.status = 'reviewed'
        self.period.save()

        url = reverse('liquidation-detail', kwargs={'pk': self.period.id})
        response = self.client.patch(url, {'status': 'open'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'open')
        self.period.refresh_from_db()
        self.assertEqual(self.period.status, 'open')

    def test_revert_to_open_creates_audit_log(self):
        self.period.status = 'reviewed'
        self.period.save()

        url = reverse('liquidation-detail', kwargs={'pk': self.period.id})
        self.client.patch(url, {'status': 'open'}, format='json')

        log = AuditLog.objects.filter(action='REVERT_LIQUIDATION_PERIOD').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.previous_data['status'], 'reviewed')
        self.assertEqual(log.new_data['status'], 'open')
        self.assertEqual(log.previous_data['period_id'], self.period.id)

    def test_closed_period_cannot_change_status(self):
        self.period.status = 'closed'
        self.period.save()

        url = reverse('liquidation-detail', kwargs={'pk': self.period.id})
        response = self.client.patch(url, {'status': 'open'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', response.data)

    def test_invalid_status_transition_open_to_closed(self):
        self.assertEqual(self.period.status, 'open')

        url = reverse('liquidation-detail', kwargs={'pk': self.period.id})
        response = self.client.patch(url, {'status': 'closed'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', response.data)


class SimulateAPITests(APITestCase):
    """Tests del endpoint POST /api/liquidations/{id}/simulate/."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin_sim', password='admin123', email='admin_sim@coop.test', role='admin',
        )
        self.client.force_authenticate(user=self.admin)

        self.assoc_user = User.objects.create_user(
            username='socio_sim', email='sim@coop.test', first_name='Luis', last_name='García',
        )
        self.associate = Associate.objects.create(
            user=self.assoc_user,
            dni='30000001',
            cbu='0000000000000000000030',
            entry_date=date(2022, 1, 1),
            personal_email='luis.personal@coop.test',
            phone_number='789',
            address='Calle 3',
        )
        self.period = LiquidationPeriod.objects.create(
            month=6, year=2025,
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00'),
        )

    def _url(self):
        return reverse('liquidation-simulate', kwargs={'pk': self.period.id})

    # ---- No toca la base de datos ---- #

    def test_simulate_does_not_create_retirement_details(self):
        """La simulación no debe persistir ningún RetirementDetail."""
        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        response = self.client.post(self._url(), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(RetirementDetail.objects.filter(liquidation=self.period).exists())

    def test_simulate_does_not_create_liquidation_items(self):
        """La simulación no debe persistir ningún LiquidationItem."""
        module = Module.objects.create(name='Bono Sim', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='10%', type='percentage', value=Decimal('10.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)

        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        self.client.post(self._url(), payload, format='json')

        self.assertEqual(LiquidationItem.objects.count(), 0)

    # ---- Respuesta y estructura ---- #

    def test_simulate_returns_test_mode_true(self):
        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        response = self.client.post(self._url(), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['test_mode'])

    def test_simulate_calculates_amounts_correctly(self):
        """160 hs × $100 = $16.000 base; sin módulos, total = $16.000."""
        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        response = self.client.post(self._url(), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        retirement = response.data['retirements'][0]
        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '0.00')
        self.assertEqual(retirement['total_amount'], '16000.00')

    def test_simulate_with_module_returns_correct_additional(self):
        """Con un módulo de 10%, el adicional debe ser $1.600 sobre $16.000 base."""
        module = Module.objects.create(name='Presentismo', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='Completo', type='percentage', value=Decimal('10.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)

        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        response = self.client.post(self._url(), payload, format='json')

        retirement = response.data['retirements'][0]
        self.assertEqual(retirement['additional_amount'], '1600.00')
        self.assertEqual(retirement['total_amount'], '17600.00')

    def test_simulate_returns_retirements_count(self):
        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        response = self.client.post(self._url(), payload, format='json')

        self.assertEqual(response.data['retirements_count'], 1)

    # ---- Validaciones de entrada ---- #

    def test_simulate_rejects_empty_entries(self):
        """El payload no puede tener entries vacío."""
        response = self.client.post(self._url(), {'entries': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_simulate_blocked_on_closed_period(self):
        """Un periodo cerrado no puede simularse."""
        self.period.status = 'closed'
        self.period.save()

        payload = {'entries': [{'associate_id': self.associate.id, 'hours_worked': 160}]}
        response = self.client.post(self._url(), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_simulate_rejects_unknown_associate_ids(self):
        """IDs inexistentes deben devolver 400 con la lista de faltantes (igual que upload-hours)."""
        payload = {'entries': [
            {'associate_id': self.associate.id, 'hours_worked': 160},
            {'associate_id': 99999, 'hours_worked': 80},
        ]}
        response = self.client.post(self._url(), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(99999, [int(x) for x in response.data['missing_associate_ids']])


class LiquidationFullFlowAPITests(APITestCase):
    """
    Test de integración end-to-end del flujo mensual completo, recorriendo
    SOLO la API REST (sin instanciar modelos directamente salvo el admin que
    necesita un password para autenticarse vía login).

    Encadena, en orden, el "camino feliz" documentado en el README y la
    colección Postman:

        1.  Login (JWT)                          POST /api/auth/login/
        2.  Configuración global                 POST /api/config/
        3.  Módulo + variante                    POST /api/modules/
        4.  Alta de usuario asociado             POST /api/users/
        5.  Alta de asociado                     POST /api/associates/
        6.  Asignación de variante               POST /api/associate-variants/
        7.  Creación del período                 POST /api/liquidations/
        8.  Simulación en memoria                POST /api/liquidations/{id}/simulate/
        9.  Carga de horas                       POST /api/liquidations/{id}/upload-hours/
        10. Marca de revisión                    PATCH /api/liquidations/{id}/
        11. Auditoría de cierre (dry-run)        POST /api/liquidations/{id}/calculate/ test_mode=true
        12. Ejecución definitiva                 POST /api/liquidations/{id}/calculate/ test_mode=false
        13. Cierre del período                   PATCH /api/liquidations/{id}/
        14. Resumen / recibos                    GET  /api/liquidations/{id}/summary/
                                                 GET  /api/retirements/?liquidation={id}

    Aritmética esperada (valor hora $100, tope 30%, módulo simple 10%):
        base       = 160 hs * $100      = $16.000,00
        adicional  = 10% de $16.000     =  $1.600,00
        tope       = 30% de $16.000     =  $4.800,00 (no se supera -> sin ajuste)
        total      = $16.000 + $1.600   = $17.600,00
    """

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin_flow',
            password='admin12345',
            email='admin_flow@coop.test',
            role='admin',
        )

    def test_full_monthly_flow_via_api(self):
        # 1. Login: obtiene el access token y lo deja en las credenciales del cliente.
        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin_flow', 'password': 'admin12345'},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)
        access_token = login_response.data['access']
        self.assertTrue(access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 2. Configuración global (valor hora + tope). El período la congela luego.
        config_response = self.client.post(
            reverse('config-list'),
            {'hour_value': '100.00', 'cap_percentage': '30.00'},
            format='json',
        )
        self.assertEqual(config_response.status_code, status.HTTP_201_CREATED, config_response.data)

        # 3. Módulo simple con una variante de 10% (no default, no aplica a tope).
        module_response = self.client.post(
            reverse('module-list'),
            {
                'name': 'Presentismo',
                'calculation_type': 'simple',
                'applies_to_cap': False,
                'is_exclusive': True,
                'variants': [
                    {'name': 'Completo', 'type': 'percentage', 'value': '10.00', 'is_default': False},
                ],
            },
            format='json',
        )
        self.assertEqual(module_response.status_code, status.HTTP_201_CREATED, module_response.data)
        variant_id = module_response.data['variants'][0]['id']

        # 4. Alta del usuario asociado.
        user_response = self.client.post(
            reverse('user-list'),
            {
                'username': 'socio_flow',
                'email': 'socio_flow@coop.test',
                'password': 'socio12345',
                'first_name': 'Marta',
                'last_name': 'López',
                'role': 'associate',
            },
            format='json',
        )
        self.assertEqual(user_response.status_code, status.HTTP_201_CREATED, user_response.data)
        user_id = user_response.data['id']

        # 5. Alta del asociado (perfil de negocio asociado al user).
        associate_response = self.client.post(
            reverse('associate-list'),
            {
                'user': user_id,
                'dni': '40000001',
                'cbu': '0000000000000000000040',
                'entry_date': '2022-01-01',
                'base_hours': 8,
                'personal_email': 'marta.personal@coop.test',
                'phone_number': '111',
                'address': 'Calle 4',
            },
            format='json',
        )
        self.assertEqual(associate_response.status_code, status.HTTP_201_CREATED, associate_response.data)
        associate_id = associate_response.data['id']

        # 6. Asignación explícita de la variante al asociado.
        av_response = self.client.post(
            reverse('associatevariant-list'),
            {'associate': associate_id, 'variant': variant_id},
            format='json',
        )
        self.assertEqual(av_response.status_code, status.HTTP_201_CREATED, av_response.data)

        # 7. Creación del período: congela valor hora/tope desde la config vigente.
        period_response = self.client.post(
            reverse('liquidation-list'),
            {'month': 6, 'year': 2025},
            format='json',
        )
        self.assertEqual(period_response.status_code, status.HTTP_201_CREATED, period_response.data)
        period_id = period_response.data['id']
        self.assertEqual(period_response.data['applied_hour_value'], '100.00')
        self.assertEqual(period_response.data['applied_cap_pct'], '30.00')
        self.assertEqual(period_response.data['status'], 'open')

        entries_payload = {'entries': [{'associate_id': associate_id, 'hours_worked': 160}]}

        # 8. Simulación en memoria: calcula sin persistir nada.
        simulate_response = self.client.post(
            reverse('liquidation-simulate', kwargs={'pk': period_id}),
            entries_payload,
            format='json',
        )
        self.assertEqual(simulate_response.status_code, status.HTTP_200_OK, simulate_response.data)
        self.assertTrue(simulate_response.data['test_mode'])
        sim_retirement = simulate_response.data['retirements'][0]
        self.assertEqual(sim_retirement['base_amount'], '16000.00')
        self.assertEqual(sim_retirement['additional_amount'], '1600.00')
        self.assertEqual(sim_retirement['total_amount'], '17600.00')
        # La simulación NO debe haber tocado la base de datos.
        self.assertFalse(RetirementDetail.objects.filter(liquidation_id=period_id).exists())

        # 9. Carga definitiva de horas (persiste RetirementDetail en cero).
        upload_response = self.client.post(
            reverse('liquidation-upload-hours', kwargs={'pk': period_id}),
            entries_payload,
            format='json',
        )
        self.assertEqual(upload_response.status_code, status.HTTP_200_OK, upload_response.data)
        self.assertEqual(upload_response.data['created'], 1)
        self.assertEqual(upload_response.data['updated'], 0)

        # 10. Marca de revisión del período.
        review_response = self.client.patch(
            reverse('liquidation-detail', kwargs={'pk': period_id}),
            {'status': 'reviewed'},
            format='json',
        )
        self.assertEqual(review_response.status_code, status.HTTP_200_OK, review_response.data)
        self.assertEqual(review_response.data['status'], 'reviewed')

        # 11. Auditoría de cierre (dry-run): no crea LiquidationItem.
        dry_run_response = self.client.post(
            reverse('liquidation-calculate', kwargs={'pk': period_id}),
            {'test_mode': True},
            format='json',
        )
        self.assertEqual(dry_run_response.status_code, status.HTTP_200_OK, dry_run_response.data)
        self.assertTrue(dry_run_response.data['test_mode'])
        self.assertEqual(LiquidationItem.objects.count(), 0)

        # 12. Ejecución definitiva: persiste montos + items y registra AuditLog.
        final_response = self.client.post(
            reverse('liquidation-calculate', kwargs={'pk': period_id}),
            {'test_mode': False},
            format='json',
        )
        self.assertEqual(final_response.status_code, status.HTTP_200_OK, final_response.data)
        self.assertFalse(final_response.data['test_mode'])

        retirement = RetirementDetail.objects.get(
            liquidation_id=period_id, associate_id=associate_id,
        )
        self.assertEqual(retirement.base_amount, Decimal('16000.00'))
        self.assertEqual(retirement.additional_amount, Decimal('1600.00'))
        self.assertEqual(retirement.cap_adjustment, Decimal('0.00'))
        self.assertEqual(retirement.total_amount, Decimal('17600.00'))
        self.assertEqual(retirement.items.count(), 1)
        self.assertTrue(
            AuditLog.objects.filter(action='RUN_LIQUIDATION_ENGINE').exists()
        )

        # 13. Cierre del período.
        close_response = self.client.patch(
            reverse('liquidation-detail', kwargs={'pk': period_id}),
            {'status': 'closed'},
            format='json',
        )
        self.assertEqual(close_response.status_code, status.HTTP_200_OK, close_response.data)
        self.assertEqual(close_response.data['status'], 'closed')

        # 14. Reportes: resumen + listado de recibos persistidos.
        summary_response = self.client.get(
            reverse('liquidation-summary', kwargs={'pk': period_id})
        )
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK, summary_response.data)
        self.assertEqual(summary_response.data['retirements_count'], 1)
        self.assertEqual(summary_response.data['totals']['total_amount'], '17600.00')

        retirements_response = self.client.get(
            reverse('retirement-list'), {'liquidation': period_id}
        )
        self.assertEqual(retirements_response.status_code, status.HTTP_200_OK, retirements_response.data)
        self.assertEqual(len(retirements_response.data), 1)
        self.assertEqual(retirements_response.data[0]['total_amount'], '17600.00')

        # Final: un período cerrado ya no puede recalcularse.
        blocked_response = self.client.post(
            reverse('liquidation-calculate', kwargs={'pk': period_id}),
            {'test_mode': False},
            format='json',
        )
        self.assertEqual(blocked_response.status_code, status.HTTP_400_BAD_REQUEST)
