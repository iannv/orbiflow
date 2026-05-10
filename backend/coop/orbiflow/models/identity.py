from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('treasurer', 'Tesorero'),
        ('associate', 'Asociado'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='associate')
    email = models.EmailField(unique=True)
    is_deleted = models.BooleanField(default=False)

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