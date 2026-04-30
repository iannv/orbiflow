from django.db import models
from django.utils import timezone

class Module(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    applies_to_cap = models.BooleanField(default=False)
    is_exclusive = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'modules'
        verbose_name = 'Módulo'
        verbose_name_plural = 'Módulos'

    def __str__(self):
        return self.name

class Variant(models.Model):
    TYPE_CHOICES = [('fixed_amount', 'Monto Fijo'), ('percentage', 'Porcentaje')]
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'variants'
        verbose_name = 'Variante'
        verbose_name_plural = 'Variantes'

    def __str__(self):
        return f"{self.module.name} - {self.name} ({self.get_type_display()})"

class AssociateVariant(models.Model):
    associate = models.ForeignKey('orbiflow.Associate', on_delete=models.CASCADE)
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    activation_date = models.DateField(default=timezone.now)

    class Meta:
        db_table = 'associate_variants'
        unique_together = ('associate', 'variant')
        verbose_name = 'Variante por Asociado'
        verbose_name_plural = 'Variantes por Asociados'