from django.db import models

class LiquidationPeriod(models.Model):
    STATUS_CHOICES = [('open', 'Abierto'), ('reviewed', 'En Revisión'), ('closed', 'Cerrado')]
    
    month = models.IntegerField()
    year = models.IntegerField()
    applied_hour_value = models.DecimalField(max_digits=12, decimal_places=2)
    applied_cap_pct = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')

    class Meta:
        db_table = 'liquidation_periods'
        unique_together = ('month', 'year')
        verbose_name = 'Periodo de Liquidación'
        verbose_name_plural = 'Periodos de Liquidación'

    def __str__(self):
        return f"{self.month}/{self.year} - {self.get_status_display()}"

class RetirementDetail(models.Model):
    liquidation = models.ForeignKey(LiquidationPeriod, on_delete=models.CASCADE, related_name='retirements')
    associate = models.ForeignKey('orbiflow.Associate', on_delete=models.PROTECT)
    hours_worked = models.IntegerField(default=0)
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    additional_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cap_adjustment = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Monto descontado por superar el tope reglamentario.",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'retirement_details'
        unique_together = ('liquidation', 'associate')
        verbose_name = 'Detalle de Retiro'
        verbose_name_plural = 'Detalles de Retiros'

    def __str__(self):
        return f"Recibo {self.associate.full_name} - {self.liquidation}"

class LiquidationItem(models.Model):
    retirement = models.ForeignKey(RetirementDetail, on_delete=models.CASCADE, related_name='items')
    module_name = models.CharField(max_length=100) 
    calculated_value = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'liquidation_items'
        verbose_name = 'Ítem de Liquidación'
        verbose_name_plural = 'Ítems de Liquidación'

    def __str__(self):
        return f"{self.module_name}: ${self.calculated_value}"