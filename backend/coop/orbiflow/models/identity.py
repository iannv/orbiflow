from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.contrib.auth.base_user import BaseUserManager

class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, email, password, **extra_fields):
        if not username:
            raise ValueError('The given username must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Ensure superusers have role 'admin' by default
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('treasurer', 'Tesorero'),
        ('associate', 'Asociado'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='associate')
    email = models.EmailField(unique=True)
    is_deleted = models.BooleanField(default=False)
    is_coop_member = models.BooleanField(
        default=False,
        verbose_name='Miembro de la cooperativa',
        help_text=(
            'Indica si el usuario es socio de la cooperativa. '
            'No otorga permisos en la API: la autorización depende del campo `role`. '
            'No confundir con `is_staff`, que controla acceso al panel /admin/ de Django.'
        ),
    )

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'


class Associate(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='associate_profile')
    dni = models.CharField(max_length=8, unique=True)
    cbu = models.CharField(max_length=22, unique=True)
    entry_date = models.DateField()
    base_hours = models.IntegerField(default=8)
    personal_email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20) 
    address = models.CharField(max_length=255)
    emergency_contact = models.JSONField(
        default=dict, 
        help_text="Guardar nombre, teléfono y vínculo"
    )
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'associates' # Nombre exacto en la DB
        verbose_name_plural = 'Asociados'
    
    @property
    def is_active(self):
        return self.user.is_active
    
    @property
    def first_name(self):
        return self.user.first_name

    @property
    def last_name(self):
        return self.user.last_name

    @property
    def full_name(self):
        return f"{self.user.first_name} {self.user.last_name}"
    
    @property
    def work_email(self):
        return self.user.email
    
    @property
    def years_in_coop(self):
        if not self.entry_date:
            return 0
        
        return (timezone.now().date() - self.entry_date).days // 365


# Role assignment for superusers is handled in UserManager.create_superuser