from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orbiflow', '0004_alter_associatevariant_activation_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='retirementdetail',
            name='cap_adjustment',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Monto descontado por superar el tope reglamentario.',
                max_digits=12,
            ),
        ),
        migrations.AlterField(
            model_name='retirementdetail',
            name='hours_worked',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='retirementdetail',
            name='base_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='retirementdetail',
            name='additional_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='retirementdetail',
            name='total_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='retirementdetail',
            name='liquidation',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='retirements',
                to='orbiflow.liquidationperiod',
            ),
        ),
    ]
