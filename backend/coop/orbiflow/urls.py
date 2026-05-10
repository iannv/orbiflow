from django.urls import path, include # Se agregó include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import UserViewSet, AssociateViewSet
from .views_auth import CurrentUserView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'associates', AssociateViewSet, basename='associate')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),

    path('', include(router.urls)),
]