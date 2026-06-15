"""
Tests unitarios del Motor de Liquidación de OrbiFlow.

Ejercitan la lógica de cálculo directamente sobre el servicio
`LiquidationCalculator` y el helper `calculate_seniority_years`, sin pasar
por la API REST.

Cubre:
    * Cálculo Base (horas * valor hora).
    * Módulos simples (porcentaje y monto fijo).
    * Módulo de Antigüedad (seniority) calculando años hasta el último día del mes.
    * Validación de Topes y persistencia del cap_adjustment.
    * Modo dry-run (test_mode=True) no persiste.
    * Modo final (test_mode=False) persiste RetirementDetail + LiquidationItem.
"""
from datetime import date
from decimal import Decimal

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

    # ---- Casos borde ---- #

    def test_zero_hours_produces_zero_amounts(self):
        """Sin horas trabajadas, el retiro base y el total deben ser cero."""
        self._create_retirement(hours=0)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['base_amount'], '0.00')
        self.assertEqual(retirement['additional_amount'], '0.00')
        self.assertEqual(retirement['total_amount'], '0.00')

    def test_percentage_rounds_half_up(self):
        """
        El motor cuantiza a 2 decimales con ROUND_HALF_UP.

        valor hora $33,33 × 10 hs = $333,30 base.
        Variante 15% -> 333,30 × 15 / 100 = 49,995 -> redondea a $50,00.
        """
        period = LiquidationPeriod.objects.create(
            month=11, year=2024,
            applied_hour_value=Decimal('33.33'),
            applied_cap_pct=Decimal('30.00'),
        )
        module = Module.objects.create(name='Redondeo', calculation_type='simple')
        variant = Variant.objects.create(
            module=module, name='15%', type='percentage', value=Decimal('15.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        RetirementDetail.objects.create(
            liquidation=period, associate=self.associate, hours_worked=10,
        )

        result = LiquidationCalculator(period).run(test_mode=True)
        retirement = result['retirements'][0]

        self.assertEqual(retirement['base_amount'], '333.30')
        self.assertEqual(retirement['additional_amount'], '50.00')
        self.assertEqual(retirement['total_amount'], '383.30')

    def test_inactive_module_variant_is_ignored(self):
        """Las variantes de un módulo con is_active=False no se computan."""
        module = Module.objects.create(
            name='Bono Suspendido', calculation_type='simple', is_active=False,
        )
        variant = Variant.objects.create(
            module=module, name='20%', type='percentage', value=Decimal('20.00'),
        )
        AssociateVariant.objects.create(associate=self.associate, variant=variant)
        self._create_retirement(hours=160)

        result = LiquidationCalculator(self.period).run(test_mode=True)
        retirement = result['retirements'][0]

        # base 16000 sin adicionales: el módulo inactivo no aporta nada.
        self.assertEqual(retirement['base_amount'], '16000.00')
        self.assertEqual(retirement['additional_amount'], '0.00')
        self.assertEqual(retirement['total_amount'], '16000.00')
        self.assertEqual(len(retirement['items']), 0)
