from django.core.management.base import BaseCommand
from datetime import date
import random

from orbiflow.models.identity import User, Associate
from orbiflow.models.rules import Module, Variant, AssociateVariant
from orbiflow.models.audit import GlobalConfiguration


class Command(BaseCommand):
    help = 'Seed de datos de prueba'

    def handle(self, *args, **kwargs):
        self.stdout.write('🌱 Iniciando seed...')

        # =========================
        # LIMPIEZA
        # =========================

        AssociateVariant.objects.all().delete()
        Associate.objects.all().delete()
        Variant.objects.all().delete()
        Module.objects.all().delete()
        GlobalConfiguration.objects.all().delete()

        User.objects.exclude(username='admin').delete()

        # =========================
        # ADMIN
        # =========================

        admin, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@orbiflow.coop',
                'role': 'admin',
                'first_name': 'Admin',
                'last_name': 'OrbiFlow',
                'is_staff': True,
                'is_superuser': True,
            }
        )

        admin.set_password('admin123')
        admin.save()

        # =========================
        # TESORERO
        # =========================

        treasurer, _ = User.objects.get_or_create(
            username='tesorero',
            defaults={
                'email': 'tesorero@orbiflow.coop',
                'role': 'treasurer',
                'first_name': 'Carlos',
                'last_name': 'Tesorero',
            }
        )

        treasurer.set_password('admin123')
        treasurer.save()

        # =========================
        # CONFIG GLOBAL
        # =========================

        GlobalConfiguration.objects.create(
            hour_value=1500,
            cap_percentage=30,
            user=admin,
        )

        # =========================
        # MODULOS
        # =========================

        presentismo, _ = Module.objects.get_or_create(
            name='Presentismo',
            defaults={
                'description': 'Bono por asistencia',
                'calculation_type': 'simple',
                'applies_to_cap': True,
                'is_exclusive': True,
                'is_active': True,
            }
        )

        antiguedad, _ = Module.objects.get_or_create(
            name='Antigüedad',
            defaults={
                'description': 'Adicional por antigüedad',
                'calculation_type': 'seniority',
                'applies_to_cap': False,
                'is_exclusive': True,
                'is_active': True,
            }
        )

        nocturnidad, _ = Module.objects.get_or_create(
            name='Nocturnidad',
            defaults={
                'description': 'Turno noche',
                'calculation_type': 'simple',
                'applies_to_cap': True,
                'is_exclusive': False,
                'is_active': True,
            }
        )

        # =========================
        # VARIANTES
        # =========================

        variants = [
            Variant.objects.get_or_create(
                module=presentismo,
                name='Completo',
                defaults={
                    'type': 'percentage',
                    'value': 10,
                    'is_default': True,
                }
            )[0],

            Variant.objects.get_or_create(
                module=antiguedad,
                name='1% anual',
                defaults={
                    'type': 'percentage',
                    'value': 1,
                    'is_default': True,
                }
            )[0],

            Variant.objects.get_or_create(
                module=nocturnidad,
                name='Turno noche',
                defaults={
                    'type': 'fixed',
                    'value': 25000,
                    'is_default': True,
                }
            )[0],
        ]

        # =========================
        # ASOCIADOS
        # =========================

        first_names = [
            'Lucio','Romina','Ian','Malena','Carla',
            'Joaquín','Micaela','Valentina','Tomás',
            'Agustina','Franco','Martina'
        ]

        last_names = [
            'Rodriguez','Palacios','Vazquez','Guardia',
            'Lopez','Fernandez','Gomez','Sosa',
            'Martinez','Ruiz','Torres','Diaz'
        ]

        for i in range(12):

            first_name = first_names[i]
            last_name = last_names[i]

            username = f'{first_name.lower()}.{last_name.lower()}'

            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@orbiflow.coop',
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'associate',
                }
            )

            user.set_password('admin123')
            user.save()

            associate, _ = Associate.objects.get_or_create(
                user=user,
                defaults={
                    'dni': f'{random.randint(20000000, 45000000)}',
                    'cbu': f'000000310001000000{i:04}',
                    'entry_date': date(
                        random.randint(2020, 2025),
                        random.randint(1, 12),
                        random.randint(1, 28)
                    ),
                    'base_hours': random.choice([4, 6, 8]),
                    'personal_email': f'{username}@gmail.com',
                    'phone_number': f'11{random.randint(10000000,99999999)}',
                    'address': f'Calle {i + 100}',
                    'is_deleted': random.choice([False, False, False, True]),
                }
            )

            selected = random.sample(
                variants,
                random.randint(1, 3)
            )

            for variant in selected:
                AssociateVariant.objects.get_or_create(
                    associate=associate,
                    variant=variant
                )

        self.stdout.write(
            self.style.SUCCESS(
                '🎉 Seed completado | password: admin123'
            )
        )


# COMANDO:
# docker compose exec backend python manage.py seed