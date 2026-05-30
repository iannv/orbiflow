from django.urls import path, include # Se agregó include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AssociateVariantViewSet, UserViewSet, AssociateViewSet,
    GlobalConfigurationViewSet, ModuleViewSet, VariantViewSet,
    LiquidationPeriodViewSet, RetirementDetailViewSet,
)
from .views_auth import CurrentUserView, OrbiflowTokenObtainPairView

router = DefaultRouter(trailing_slash=True)
router.register(r'users', UserViewSet, basename='user')
router.register(r'associates', AssociateViewSet, basename='associate')
router.register(r'config', GlobalConfigurationViewSet, basename='config')
router.register(r'modules', ModuleViewSet, basename='module')
router.register(r'variants', VariantViewSet, basename='variant')
router.register(r'associate-variants', AssociateVariantViewSet, basename='associatevariant')
router.register(r'liquidations', LiquidationPeriodViewSet, basename='liquidation')
router.register(r'retirements', RetirementDetailViewSet, basename='retirement')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', OrbiflowTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),

    path('', include(router.urls)),
]