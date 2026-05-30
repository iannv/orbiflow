from django.db import models

class GlobalConfiguration(models.Model):
    """
    Histórico de parámetros globales (Valor Hora y Tope %).
    """
    change_date = models.DateTimeField(auto_now_add=True)
    hour_value = models.DecimalField(max_digits=12, decimal_places=2)
    cap_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    user = models.ForeignKey('orbiflow.User', on_delete=models.PROTECT)

    class Meta:
        db_table = 'global_configurations'
        verbose_name = 'Configuración Global'
        verbose_name_plural = 'Configuraciones Globales'

class AuditLog(models.Model):
    """
    Registro detallado para trazabilidad absoluta de excedentes.
    """
    user = models.ForeignKey('orbiflow.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    date = models.DateTimeField(auto_now_add=True)
    previous_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Log de Auditoría'
        verbose_name_plural = 'Logs de Auditoría'

    def __str__(self):
        return f"{self.date.strftime('%d/%m/%Y %H:%M')} - {self.user} - {self.action}"