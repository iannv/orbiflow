from django.db import migrations, models


def backfill_is_coop_member(apps, schema_editor):
    """
    Antes de esta migración el frontend usaba `is_staff` para representar
    "miembro de la cooperativa". Migramos ese valor al nuevo campo y dejamos
    `is_staff` solo para lo que Django entiende por staff (acceso al panel admin):
    lo conservamos sólo en superusuarios; el resto vuelve a False.
    """
    User = apps.get_model('orbiflow', 'User')
    for user in User.objects.all():
        user.is_coop_member = bool(user.is_staff)
        if not user.is_superuser:
            user.is_staff = False
        user.save(update_fields=['is_coop_member', 'is_staff'])


def reverse_backfill(apps, schema_editor):
    """
    Reverso: si retrocedemos, dejamos `is_staff = is_coop_member` para no perder
    el dato de membresía que el frontend antiguo leía desde `is_staff`.
    """
    User = apps.get_model('orbiflow', 'User')
    for user in User.objects.all():
        if user.is_coop_member and not user.is_staff:
            user.is_staff = True
            user.save(update_fields=['is_staff'])


class Migration(migrations.Migration):

    dependencies = [
        ('orbiflow', '0005_retirementdetail_cap_adjustment'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_coop_member',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'Indica si el usuario es socio de la cooperativa. '
                    'No otorga permisos en la API: la autorización depende del campo `role`. '
                    'No confundir con `is_staff`, que controla acceso al panel /admin/ de Django.'
                ),
                verbose_name='Miembro de la cooperativa',
            ),
        ),
        migrations.RunPython(backfill_is_coop_member, reverse_backfill),
    ]
