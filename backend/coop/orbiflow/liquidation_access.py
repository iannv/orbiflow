from django.db.models import ExpressionWrapper, F, IntegerField, QuerySet

from .models.identity import Associate
from .permissions import ROLE_ASSOCIATE


def period_ym(year: int, month: int) -> int:
    return year * 12 + (month - 1)


def associate_min_period_ym(entry_date) -> int:
    return period_ym(entry_date.year, entry_date.month)


def filter_closed_periods_from_entry(queryset: QuerySet, entry_date) -> QuerySet:
    """Periodos cerrados desde el mes/año de ingreso del asociado (inclusive)."""
    min_ym = associate_min_period_ym(entry_date)
    return (
        queryset.filter(status='closed')
        .annotate(
            period_ym=ExpressionWrapper(
                F('year') * 12 + F('month') - 1,
                output_field=IntegerField(),
            ),
        )
        .filter(period_ym__gte=min_ym)
    )


def filter_liquidation_periods_for_user(queryset: QuerySet, user) -> QuerySet:
    """
    Admin y tesorero: sin restricción adicional.
    Asociado: solo periodos cerrados desde su fecha de ingreso.
    """
    if getattr(user, 'role', None) != ROLE_ASSOCIATE:
        return queryset

    try:
        associate = Associate.objects.get(user=user, is_deleted=False)
    except Associate.DoesNotExist:
        return queryset.none()

    return filter_closed_periods_from_entry(queryset, associate.entry_date)
