"""
Motor de Liquidación de OrbiFlow.

Encapsula la lógica de cálculo del retiro mensual de cada asociado:
    1. Retiro Base   = horas_trabajadas * applied_hour_value
    2. Adicionales   = suma de todos los módulos asignados (simple / seniority).
    3. Validación de Topes: los módulos con applies_to_cap=True que en
       conjunto superen el applied_cap_pct del Retiro Base se ajustan, y el
       monto descontado se persiste en RetirementDetail.cap_adjustment.

Soporta ejecución en modo "dry-run" (test_mode=True) que devuelve el desglose
sin tocar la base de datos.
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable

from django.db import transaction

from ..models.core import LiquidationItem, LiquidationPeriod, RetirementDetail
from ..models.identity import Associate
from ..models.rules import AssociateVariant, Variant


TWO_PLACES = Decimal('0.01')
ZERO = Decimal('0.00')


def _q(value) -> Decimal:
    """Cuantiza a 2 decimales con redondeo bancario half-up."""
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_seniority_years(entry_date: date, period_year: int, period_month: int) -> int:
    """
    Calcula años cumplidos desde entry_date hasta el último día del mes del
    periodo de liquidación. Devuelve 0 si el asociado todavía no cumplió un año.
    """
    if entry_date is None:
        return 0
    last_day = calendar.monthrange(period_year, period_month)[1]
    period_end = date(period_year, period_month, last_day)
    if period_end < entry_date:
        return 0

    years = period_end.year - entry_date.year
    if (period_end.month, period_end.day) < (entry_date.month, entry_date.day):
        years -= 1
    return max(years, 0)


@dataclass
class CalculatedItem:
    """Representa una línea de detalle del recibo, antes de persistir."""
    module_id: int
    module_name: str
    variant_id: int
    variant_name: str
    calculation_type: str       # 'simple' | 'seniority'
    variant_type: str           # 'fixed_amount' | 'percentage'
    variant_value: Decimal
    seniority_years: int
    applies_to_cap: bool
    calculated_value: Decimal

    def as_dict(self) -> dict:
        return {
            'module_id': self.module_id,
            'module_name': self.module_name,
            'variant_id': self.variant_id,
            'variant_name': self.variant_name,
            'calculation_type': self.calculation_type,
            'variant_type': self.variant_type,
            'variant_value': str(_q(self.variant_value)),
            'seniority_years': self.seniority_years,
            'applies_to_cap': self.applies_to_cap,
            'calculated_value': str(_q(self.calculated_value)),
        }


@dataclass
class CalculatedRetirement:
    """Resultado del cálculo de un asociado dentro de una liquidación."""
    associate_id: int
    associate_full_name: str
    hours_worked: int
    hour_value: Decimal
    base_amount: Decimal
    additional_amount: Decimal
    cap_adjustment: Decimal
    total_amount: Decimal
    cap_limit: Decimal
    items: list[CalculatedItem] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            'associate_id': self.associate_id,
            'associate_full_name': self.associate_full_name,
            'hours_worked': self.hours_worked,
            'hour_value': str(_q(self.hour_value)),
            'base_amount': str(_q(self.base_amount)),
            'additional_amount': str(_q(self.additional_amount)),
            'cap_adjustment': str(_q(self.cap_adjustment)),
            'total_amount': str(_q(self.total_amount)),
            'cap_limit': str(_q(self.cap_limit)),
            'items': [item.as_dict() for item in self.items],
        }


class LiquidationCalculator:
    """
    Servicio principal del motor de liquidación.

    Uso:
        calc = LiquidationCalculator(period)
        result = calc.run(test_mode=True)   # dry-run
        result = calc.run(test_mode=False)  # persiste en DB
    """

    def __init__(self, period: LiquidationPeriod):
        self.period = period
        self.hour_value = Decimal(period.applied_hour_value)
        self.cap_pct = Decimal(period.applied_cap_pct)

    # ----- API pública --------------------------------------------------- #

    def run(self, test_mode: bool = True) -> dict:
        """
        Ejecuta el motor sobre todas las RetirementDetail del periodo (donde se
        cargaron horas previamente). Si test_mode=True devuelve el desglose sin
        persistir; si es False actualiza RetirementDetail y crea LiquidationItem.
        """
        retirements = list(
            RetirementDetail.objects
            .filter(liquidation=self.period)
            .select_related('associate', 'associate__user')
        )

        results: list[CalculatedRetirement] = []
        for retirement in retirements:
            calc_result = self._calculate_for_associate(
                associate=retirement.associate,
                hours_worked=retirement.hours_worked,
            )
            results.append(calc_result)

        if not test_mode:
            self._persist(results)

        return {
            'period': {
                'id': self.period.id,
                'month': self.period.month,
                'year': self.period.year,
                'applied_hour_value': str(_q(self.hour_value)),
                'applied_cap_pct': str(_q(self.cap_pct)),
                'status': self.period.status,
            },
            'test_mode': test_mode,
            'retirements_count': len(results),
            'totals': self._aggregate(results),
            'retirements': [r.as_dict() for r in results],
        }

    # ----- Cálculo por asociado ----------------------------------------- #

    def _calculate_for_associate(self, associate: Associate, hours_worked: int) -> CalculatedRetirement:
        hours = int(hours_worked or 0)
        base_amount = _q(Decimal(hours) * self.hour_value)

        seniority_years = calculate_seniority_years(
            associate.entry_date, self.period.year, self.period.month,
        )

        items = self._build_items(associate, base_amount, seniority_years)

        # Tope: solo aplica a items con applies_to_cap=True
        cap_limit = _q(base_amount * self.cap_pct / Decimal(100))
        cap_applicable_total = sum(
            (i.calculated_value for i in items if i.applies_to_cap),
            ZERO,
        )

        cap_adjustment = ZERO
        if cap_applicable_total > cap_limit:
            cap_adjustment = _q(cap_applicable_total - cap_limit)

        gross_additional = sum((i.calculated_value for i in items), ZERO)
        additional_amount = _q(gross_additional)
        total_amount = _q(base_amount + additional_amount - cap_adjustment)

        return CalculatedRetirement(
            associate_id=associate.id,
            associate_full_name=associate.full_name,
            hours_worked=hours,
            hour_value=self.hour_value,
            base_amount=base_amount,
            additional_amount=additional_amount,
            cap_adjustment=cap_adjustment,
            total_amount=total_amount,
            cap_limit=cap_limit,
            items=items,
        )

    def _build_items(
        self,
        associate: Associate,
        base_amount: Decimal,
        seniority_years: int,
    ) -> list[CalculatedItem]:
        """Itera todas las variantes asignadas al asociado y devuelve el desglose."""
        assigned = (
            AssociateVariant.objects
            .filter(associate=associate, variant__module__is_active=True)
            .select_related('variant', 'variant__module')
        )

        items: list[CalculatedItem] = []
        for av in assigned:
            variant: Variant = av.variant
            module = variant.module
            value = self._evaluate_variant(
                variant=variant,
                module_calculation_type=module.calculation_type,
                base_amount=base_amount,
                seniority_years=seniority_years,
            )
            items.append(
                CalculatedItem(
                    module_id=module.id,
                    module_name=module.name,
                    variant_id=variant.id,
                    variant_name=variant.name,
                    calculation_type=module.calculation_type,
                    variant_type=variant.type,
                    variant_value=Decimal(variant.value),
                    seniority_years=seniority_years if module.calculation_type == 'seniority' else 0,
                    applies_to_cap=module.applies_to_cap,
                    calculated_value=value,
                )
            )
        return items

    @staticmethod
    def _evaluate_variant(
        variant: Variant,
        module_calculation_type: str,
        base_amount: Decimal,
        seniority_years: int,
    ) -> Decimal:
        """
        Aplica la fórmula correspondiente según el tipo de módulo y variante.

        - simple    + fixed_amount : value
        - simple    + percentage   : base * value / 100
        - seniority + percentage   : base * (value / 100) * años
          (Ej: 1% por año con 3 años -> equivalente a 3% del Retiro Base.)
        - seniority + fixed_amount : value * años
          (Suma `monto_fijo` por cada año cumplido de antigüedad.)
        """
        value = Decimal(variant.value)
        years = Decimal(seniority_years)

        if module_calculation_type == 'seniority':
            if variant.type == 'percentage':
                return _q(base_amount * value / Decimal(100) * years)
            return _q(value * years)

        if variant.type == 'percentage':
            return _q(base_amount * value / Decimal(100))
        return _q(value)

    # ----- Persistencia -------------------------------------------------- #

    @transaction.atomic
    def _persist(self, results: Iterable[CalculatedRetirement]) -> None:
        for r in results:
            retirement = (
                RetirementDetail.objects
                .select_for_update()
                .get(liquidation=self.period, associate_id=r.associate_id)
            )
            retirement.hours_worked = r.hours_worked
            retirement.base_amount = r.base_amount
            retirement.additional_amount = r.additional_amount
            retirement.cap_adjustment = r.cap_adjustment
            retirement.total_amount = r.total_amount
            retirement.save()

            retirement.items.all().delete()
            LiquidationItem.objects.bulk_create([
                LiquidationItem(
                    retirement=retirement,
                    module_name=f"{i.module_name} - {i.variant_name}",
                    calculated_value=i.calculated_value,
                )
                for i in r.items
            ])

    # ----- Helpers ------------------------------------------------------- #

    @staticmethod
    def _aggregate(results: list[CalculatedRetirement]) -> dict:
        total_base = sum((r.base_amount for r in results), ZERO)
        total_additional = sum((r.additional_amount for r in results), ZERO)
        total_cap_adjustment = sum((r.cap_adjustment for r in results), ZERO)
        total_amount = sum((r.total_amount for r in results), ZERO)
        return {
            'base_amount': str(_q(total_base)),
            'additional_amount': str(_q(total_additional)),
            'cap_adjustment': str(_q(total_cap_adjustment)),
            'total_amount': str(_q(total_amount)),
        }
