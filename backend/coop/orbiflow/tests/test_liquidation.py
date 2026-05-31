"""
Tests del Motor de Liquidación de OrbiFlow.

Cubre:
    * Cálculo Base (horas * valor hora).
    * Módulos simples (porcentaje y monto fijo).
    * Módulo de Antigüedad (seniority) calculando años hasta el último día del mes.
    * Validación de Topes y persistencia del cap_adjustment.
    * Modo dry-run (test_mode=True) no persiste.
    * Modo final (test_mode=False) persiste RetirementDetail + LiquidationItem.
    * Carga masiva de horas por endpoint.
    * CRUD del periodo de liquidación.
"""
from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from orbiflow.models.identity import User, Associate
from orbiflow.models.rules import Module, Variant, AssociateVariant
from orbiflow.models.core import LiquidationPeriod, RetirementDetail, LiquidationItem
from orbiflow.services.liquidation import (
    LiquidationCalculator,
    calculate_seniority_years,
)


class SeniorityHelperTests(APITestCase):
    """Pruebas unitarias del helper de cálculo de antigüedad."""

    def test_full_years_when_anniversary_already_passed(self):
        # Ingresó 15/03/2020, periodo Diciembre 2024 -> 4 años cumplidos.
        years = calculate_seniority_years(date(2020, 3, 15), 2024, 12)
        self.assertEqual(years, 4)

    def test_year_not_yet_completed(self):
        # Ingresó 15/06/2022, periodo Mayo 2024 -> aún no cumple 2 años.
        years = calculate_seniority_years(date(2022, 6, 15), 2024, 5)
        self.assertEqual(years, 1)

    def test_anniversary_on_last_day_of_month(self):
        # Ingresó 31/05/2020, periodo Mayo 2024 -> el 31/05/2024 cumple 4.
        years = calculate_seniority_years(date(2020, 5, 31), 2024, 5)
        self.assertEqual(years, 4)

    def test_negative_or_zero_when_entry_after_period(self):
        years = calculate_seniority_years(date(2025, 1, 1), 2024, 12)
        self.assertEqual(years, 0)


class LiquidationEngineUnitTests(APITestCase):
    """Pruebas directas sobre el servicio sin pasar por la API."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='socio', password='x', email='socio@coop.test',
        )
        self.associate = Associate.objects.create(
            user=self.user,
            dni='10000001',
            cbu='0000000000000000000010',
            entry_date=date(2022, 1, 1),
            personal_email='socio.personal@coop.test',
            phone_number='123',
            address='Calle 1',
        )
        # Periodo Diciembre 2024, valor hora $100, tope 30%
        self.period = LiquidationPeriod.objects.create(
            month=12, year=2024,
            applied_hour_value=Decimal('100.00'),
            applied_cap_pct=Decimal('30.00'),
        )

    def _create_retirement(self, hours):
        return RetirementDetail.objects.create(
            liquidation=self.period,
            associate=self.associate,
            hours_worked=hours,
        )

    # ---- Cálculo base ---- #

    def test_base_amount_only_no_modules(self):
        self._create_retirement(hours=160)
        result = LiquidationCalculator(self.period).run(test_mode=True)

        retirement = result['retirements'][0]
        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '0.00')
        self.assertEqual(retirement['cap_adjustment'], '0.00')
        self.assertEqual(retirement['total_amount'], '16000.00')

    # ---- Módulo simple ---- #

    def test_simple_percentage_module(self):
        module = Module.objects.create(name='Presentismo', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='Completo', type='percentage', value=Decimal('10.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '1600.00')
        self.assertEqual(retirement['total_amount'], '17600.00')
        self.assertEqual(len(retirement['items']), 1)
        self.assertEqual(retirement['items'][0]['calculated_value'], '1600.00')

    def test_simple_fixed_amount_module(self):
        module = Module.objects.create(name='Viáticos', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='Lejos', type='fixed_amount', value=Decimal('5000.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['additional_amount'], '5000.00')
        self.assertEqual(retirement['total_amount'], '21000.00')

    # ---- Módulo seniority ---- #

    def test_seniority_percentage_multiplies_by_years(self):
        # Asociado con entry_date 2022-01-01, periodo 12/2024 -> 2 años.
        # base = 16000, variante 5% por año -> 16000 * 0.05 * 2 = 1600
        module = Module.objects.create(
            name='Antigüedad', calculation_type='seniority',
        )
        variant = Variant.objects.create(
            module=module, name='Senior', type='percentage', value=Decimal('5.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['additional_amount'], '1600.00')
        self.assertEqual(retirement['items'][0]['seniority_years'], 2)

    def test_seniority_fixed_amount_multiplies_by_years_only(self):
        """
        Para `seniority + fixed_amount` la fórmula es `valor * años`
        (NO se multiplica por el Retiro Base). Ej: bono $3000 por año, 2 años -> $6000.
        """
        module = Module.objects.create(
            name='Bono Antigüedad', calculation_type='seniority',
        )
        variant = Variant.objects.create(
            module=module, name='Por año', type='fixed_amount', value=Decimal('3000.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        # base = 160 * 100 = 16000; additional = 3000 * 2 = 6000; total = 22000
        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '6000.00')
        self.assertEqual(retirement['total_amount'], '22000.00')
        self.assertEqual(retirement['items'][0]['seniority_years'], 2)

    def test_seniority_fixed_amount_adds_value_per_year(self):
        """
        Para variantes de antigüedad con monto fijo, la fórmula es
        value * años (no se multiplica por la base).
        """
        # entry_date 2022-01-01, periodo 12/2024 -> 2 años.
        # variante = $1.000 por año -> 1000 * 2 = 2000
        module = Module.objects.create(
            name='Antigüedad por monto', calculation_type='seniority',
        )
        variant = Variant.objects.create(
            module=module, name='1k por año', type='fixed_amount', value=Decimal('1000.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '2000.00')
        self.assertEqual(retirement['total_amount'], '18000.00')
        self.assertEqual(retirement['items'][0]['seniority_years'], 2)

    def test_seniority_with_zero_years_returns_zero(self):
        """Asociado que aún no cumple un año no recibe adicional por antigüedad."""
        # Periodo 12/2024 con asociado que ingresó después del cierre.
        new_user = User.objects.create_user(
            username='nuevo', password='x', email='nuevo@coop.test',
        )
        new_associate = Associate.objects.create(
            user=new_user, dni='10000099',
            cbu='0000000000000000000099',
            entry_date=date(2024, 7, 1),
            personal_email='nuevo.personal@coop.test',
            phone_number='000', address='Calle 0',
        )
        module = Module.objects.create(
            name='Antigüedad', calculation_type='seniority',
        )
        variant = Variant.objects.create(
            module=module, name='Senior', type='percentage', value=Decimal('5.00'),
        )
        AssociateVariant.objects.create(associate=new_associate, variant=variant)
        RetirementDetail.objects.create(
            liquidation=self.period, associate=new_associate, hours_worked=160,
        )

        result = LiquidationCalculator(self.period).run(test_mode=True)
        # Buscamos el recibo del nuevo asociado
        receipt = next(r for r in result['retirements'] if r['associate_id'] == new_associate.id)
        self.assertEqual(receipt['items'][0]['seniority_years'], 0)
        self.assertEqual(receipt['items'][0]['calculated_value'], '0.00')

    # ---- Tope ---- #

    def test_cap_adjustment_when_additionals_exceed_limit(self):
        """
        Base = 16000, tope 30% = 4800.
        Cargamos un % 50 con applies_to_cap=True -> 8000.
        Excedente esperado: 8000 - 4800 = 3200 (cap_adjustment).
        """
        module = Module.objects.create(
            name='Bono Especial', calculation_type='simple', applies_to_cap=True,
        )
        variant = Variant.objects.create(
            module=module, name='50%', type='percentage', value=Decimal('50.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '8000.00')
        self.assertEqual(retirement['cap_adjustment'], '3200.00')
        # total = base + additional - cap_adjustment = 16000 + 8000 - 3200 = 20800
        self.assertEqual(retirement['total_amount'], '20800.00')
        self.assertEqual(retirement['cap_limit'], '4800.00')

    def test_cap_excludes_modules_without_applies_to_cap(self):
        """
        Un módulo simple SIN applies_to_cap no debe contar para el tope.
        """
        capped = Module.objects.create(
            name='Bono', calculation_type='simple', applies_to_cap=True,
        )
        v_capped = Variant.objects.create(
            module=capped, name='40%', type='percentage', value=Decimal('40.00'),
        )
        free = Module.objects.create(
            name='Viáticos', calculation_type='simple', applies_to_cap=False,
        )
        v_free = Variant.objects.create(
            module=free, name='Fijo', type='fixed_amount', value=Decimal('10000.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=v_capped)
        AssociateVariant.objects.create(associate=self.associate, variant=v_free)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        # capped: 16000 * 40% = 6400 -> excede 4800 por 1600
        # free:   10000  (no entra al cálculo de tope)
        self.assertEqual(retirement['cap_adjustment'], '1600.00')
        self.assertEqual(retirement['additional_amount'], '16400.00')
        # total = 16000 + 16400 - 1600 = 30800
        self.assertEqual(retirement['total_amount'], '30800.00')

    # ---- test_mode ---- #

    def test_dry_run_does_not_persist_items(self):
        module = Module.objects.create(name='X', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='V', type='percentage', value=Decimal('10.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        retirement = self._create_retirement(hours=160)

        LiquidationCalculator(self.period).run(test_mode=True)

        retirement.refresh_from_db()
        self.assertEqual(retirement.base_amount, Decimal('0.00'))
        self.assertEqual(retirement.additional_amount, Decimal('0.00'))
        self.assertEqual(retirement.total_amount, Decimal('0.00'))
        self.assertEqual(LiquidationItem.objects.count(), 0)

    def test_final_run_persists_items_and_amounts(self):
        module = Module.objects.create(name='X', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='V', type='percentage', value=Decimal('10.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        retirement = self._create_retirement(hours=160)

        LiquidationCalculator(self.period).run(test_mode=False)

        retirement.refresh_from_db()
        self.assertEqual(retirement.base_amount, Decimal('16000.00'))
        self.assertEqual(retirement.additional_amount, Decimal('1600.00'))
        self.assertEqual(retirement.total_amount, Decimal('17600.00'))
        self.assertEqual(retirement.items.count(), 1)


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
        url = reverse('liquidation-list')
        response = self.client.post(url, {
            'month': 7, 'year': 2025,
            'applied_hour_value': '250.00',
            'applied_cap_pct': '25.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get(url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 2)

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
