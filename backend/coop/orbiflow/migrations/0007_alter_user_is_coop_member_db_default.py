from django.db import migrations, models


def fill_null_is_coop_member(apps, schema_editor):
    User = apps.get_model('orbiflow', 'User')
    for user in User.objects.filter(is_coop_member__isnull=True):
        user.is_coop_member = user.role in ('associate', 'treasurer')
        user.save(update_fields=['is_coop_member'])


class Migration(migrations.Migration):

    dependencies = [
        ('orbiflow', '0006_user_is_coop_member'),
    ]

    operations = [
        migrations.RunPython(fill_null_is_coop_member, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='is_coop_member',
            field=models.BooleanField(
                db_default=False,
                default=False,
                help_text=(
                    'Indica si el usuario es socio de la cooperativa. '
                    'No otorga permisos en la API: la autorización depende del campo `role`. '
                    'No confundir con `is_staff`, que controla acceso al panel /admin/ de Django.'
                ),
                verbose_name='Miembro de la cooperativa',
            ),
        ),
    ]
