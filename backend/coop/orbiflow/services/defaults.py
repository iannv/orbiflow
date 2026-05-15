"""
Servicio de propagación de variantes con `is_default=True`.

Reglas:
    * Al crear (o actualizar a default) una `Variant`, se asigna a todos los
      `Associate` existentes (no eliminados) creando un `AssociateVariant`.
    * Al crear un nuevo `Associate`, se asignan todas las `Variant` default.
    * Se respeta la exclusividad: si el módulo es exclusivo y el asociado ya
      tiene asignada otra variante de ese módulo, NO se reemplaza (se prioriza
      la elección manual previa).
"""
from __future__ import annotations

from typing import Iterable

from ..models.identity import Associate
from ..models.rules import AssociateVariant, Variant


def apply_default_variant_to_associates(variant: Variant) -> int:
    """
    Asigna `variant` (con is_default=True) a todos los asociados que aún no la
    tengan, respetando la exclusividad del módulo. Devuelve la cantidad de
    `AssociateVariant` creados.
    """
    if not variant.is_default:
        return 0

    associates = Associate.objects.filter(is_deleted=False)
    return _assign_variant_to_associates(variant, associates)


def apply_default_variants_to_associate(associate: Associate) -> int:
    """
    Asigna todas las `Variant` con `is_default=True` existentes al asociado
    recién creado, respetando exclusividad. Devuelve la cantidad creada.
    """
    default_variants = Variant.objects.filter(
        is_default=True,
    ).select_related('module')

    created = 0
    for variant in default_variants:
        created += _assign_variant_to_associates(variant, [associate])
    return created


def _assign_variant_to_associates(
    variant: Variant,
    associates: Iterable[Associate],
) -> int:
    """
    Crea `AssociateVariant` para cada asociado salvo cuando:
        * el módulo es exclusivo y el asociado ya tiene otra variante del
          mismo módulo (respeta elección previa); o
        * ya existe el registro (`unique_together` lo evita igualmente).
    """
    module = variant.module
    created_count = 0

    for associate in associates:
        if module.is_exclusive:
            already_has_module_variant = AssociateVariant.objects.filter(
                associate=associate,
                variant__module=module,
            ).exists()
            if already_has_module_variant:
                continue

        _, was_created = AssociateVariant.objects.get_or_create(
            associate=associate, variant=variant,
        )
        if was_created:
            created_count += 1
    return created_count
