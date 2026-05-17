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

            Variant.objects.update_or_create(
                module=nocturnidad,
                name='Turno noche',
                defaults={
                    'type': 'fixed_amount',
                    'value': 25000,
                    'is_default': True,
                }
            )[0],
        ]

        # =========================
        # ASOCIADOS
        # =========================

        associates_data = [
            ('Lucio',     'Rodriguez',  '30111001', '0000003100010000000001', date(2021, 3, 15),  8,  'lucio.rodriguez@gmail.com',     '1145231001', 'Av. Corrientes 1001'),
            ('Romina',    'Palacios',   '28222002', '0000003100010000000002', date(2020, 7, 20),  6,  'romina.palacios@gmail.com',     '1145231002', 'Thames 2002'),
            ('Ian',       'Vazquez',    '35333003', '0000003100010000000003', date(2022, 1, 10),  8,  'ian.vazquez@gmail.com',         '1145231003', 'Gurruchaga 3003'),
            ('Malena',    'Guardia',    '33444004', '0000003100010000000004', date(2019, 11, 5),  4,  'malena.guardia@gmail.com',      '1145231004', 'Honduras 4004'),
            ('Carla',     'Lopez',      '29555005', '0000003100010000000005', date(2023, 4, 1),   8,  'carla.lopez@gmail.com',         '1145231005', 'Serrano 5005'),
            ('Joaquín',   'Fernandez',  '31666006', '0000003100010000000006', date(2021, 9, 18),  6,  'joaquin.fernandez@gmail.com',   '1145231006', 'Palermo 6006'),
            ('Valentina', 'Gomez',      '27777007', '0000003100010000000007', date(2020, 2, 28),  8,  'valentina.gomez@gmail.com',     '1145231007', 'Santa Fe 7007'),
            ('Tomás',     'Sosa',       '36888008', '0000003100010000000008', date(2022, 6, 14),  4,  'tomas.sosa@gmail.com',          '1145231008', 'Cabrera 8008'),
            ('Agustina',  'Martinez',   '32999009', '0000003100010000000009', date(2018, 8, 22),  8,  'agustina.martinez@gmail.com',   '1145231009', 'Gallo 9009'),
            ('Franco',    'Ruiz',       '34100010', '0000003100010000000010', date(2023, 1, 7),   6,  'franco.ruiz@gmail.com',         '1145231010', 'Córdoba 1010'),
            ('Martina',   'Torres',     '26200011', '0000003100010000000011', date(2021, 5, 30),  8,  'martina.torres@gmail.com',      '1145231011', 'Soler 1011'),
            ('Nicolás',   'Diaz',       '38300012', '0000003100010000000012', date(2022, 10, 3),  4,  'nicolas.diaz@gmail.com',        '1145231012', 'Uriarte 1012'),
        ]

        for i, (first_name, last_name, dni, cbu, entry_date, base_hours, personal_email, phone, address) in enumerate(associates_data):
            username = f'{first_name.lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")}.{last_name.lower()}'

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
                    'dni': dni,
                    'cbu': cbu,
                    'entry_date': entry_date,
                    'base_hours': base_hours,
                    'personal_email': personal_email,
                    'phone_number': phone,
                    'address': address,
                    'emergency_contact': {'contact': 'Contacto Familiar - 1100000000'},
                    'is_deleted': i == 11,
                }
            )

            selected = random.sample(variants, random.randint(1, len(variants)))
            for variant in selected:
                AssociateVariant.objects.get_or_create(associate=associate, variant=variant)

        # =========================
        # USUARIOS SIN LEGAJO (para probar creación)
        # =========================

        free_users_data = [
            ('Pedro',    'Acosta',    'pedro.acosta',    'pedro.acosta@orbiflow.coop'),
            ('Sofia',    'Benitez',   'sofia.benitez',   'sofia.benitez@orbiflow.coop'),
            ('Marcos',   'Crespo',    'marcos.crespo',   'marcos.crespo@orbiflow.coop'),
        ]

        for first_name, last_name, username, email in free_users_data:
            u, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'associate',
                }
            )
            u.set_password('admin123')
            u.save()

        self.stdout.write(
            self.style.SUCCESS(
                '🎉 Seed completado | password: admin123'
            )
        )


# COMANDO:
# docker compose exec backend python manage.py seed