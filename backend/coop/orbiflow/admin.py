from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Associate, Module, Variant, 
    AssociateVariant, LiquidationPeriod, 
    RetirementDetail, LiquidationItem, 
    GlobalConfiguration, AuditLog
)


class VariantInline(admin.TabularInline):
    model = Variant
    extra = 1

class LiquidationItemInline(admin.TabularInline):
    model = LiquidationItem
    extra = 0
    readonly_fields = ('module_name', 'calculated_value')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Roles y Cooperativa', {'fields': ('role', 'is_deleted')}),
    )
    list_display = ('username', 'email', 'role', 'is_active')
    list_filter = ('role', 'is_active')

@admin.register(Associate)
class AssociateAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'dni', 'entry_date', 'years_in_coop', 'is_deleted')
    search_fields = ('user__first_name', 'user__last_name', 'dni', 'cbu')
    list_filter = ('is_deleted', 'entry_date')
    readonly_fields = ('years_in_coop',) # Calculado dinámicamente

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'applies_to_cap', 'calculation_type', 'is_exclusive', 'is_active')
    inlines = [VariantInline] # Gestión de variantes dentro del módulo

@admin.register(LiquidationPeriod)
class LiquidationPeriodAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'applied_hour_value', 'status')
    list_filter = ('status', 'year')

@admin.register(RetirementDetail)
class RetirementDetailAdmin(admin.ModelAdmin):
    list_display = ('associate', 'liquidation', 'total_amount')
    list_filter = ('liquidation',)
    search_fields = ('associate__user__last_name', 'associate__dni')
    inlines = [LiquidationItemInline] # Ver ítems del recibo

@admin.register(GlobalConfiguration)
class GlobalConfigurationAdmin(admin.ModelAdmin):
    list_display = ('change_date', 'hour_value', 'cap_percentage', 'user')
    ordering = ('-change_date',)

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('date', 'user', 'action')
    readonly_fields = ('date', 'user', 'action', 'previous_data', 'new_data') 
    list_filter = ('action', 'date')

# Registros simples restantes
admin.site.register(AssociateVariant)