from rest_framework import permissions

ROLE_ADMIN = 'admin'
ROLE_TREASURER = 'treasurer'
ROLE_ASSOCIATE = 'associate'
ELEVATED_ROLES = [ROLE_ADMIN, ROLE_TREASURER]
MANAGED_DIRECTORY_BASENAMES = ('user', 'associate')


class IsAdminOrTreasurer(permissions.BasePermission):
    """Allow only Admin and Tesorero users to access the view."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_superuser', False):
            return True
        return getattr(request.user, 'role', None) in ELEVATED_ROLES


class IsElevatedRoleOrReadOnly(permissions.BasePermission):
    """
    Admin and Tesorero: full access (unsafe methods allowed).
    Asociado: only safe methods (read-only).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(request.user, 'role', None) in ELEVATED_ROLES


class CanManageUsersAndProtectAdmin(permissions.BasePermission):
    """
    Permission for `User` and `Associate` viewsets.

  - Admin / Tesorero: CRUD completo (tesorero no puede borrar usuarios `admin`).
  - Asociado:
      - GET list en `/api/users/` y `/api/associates/` (directorio de solo lectura).
      - GET detail solo de su propio `User` y su propio `Associate`.
      - Sin POST, PUT, PATCH ni DELETE (aunque tenga `is_superuser`).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = getattr(request.user, 'role', None)
        basename = getattr(view, 'basename', None)
        action = getattr(view, 'action', None)

        if role == ROLE_ASSOCIATE and basename in MANAGED_DIRECTORY_BASENAMES:
            if request.method not in permissions.SAFE_METHODS:
                return False
            return action in ('list', 'retrieve')

        if getattr(request.user, 'is_superuser', False):
            return True

        return role in ELEVATED_ROLES

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        role = getattr(request.user, 'role', None)
        basename = getattr(view, 'basename', None)

        if role == ROLE_ASSOCIATE and basename in MANAGED_DIRECTORY_BASENAMES:
            if request.method not in permissions.SAFE_METHODS:
                return False

            from .models.identity import User, Associate

            if basename == 'user' and isinstance(obj, User):
                return obj.id == request.user.id
            if basename == 'associate' and isinstance(obj, Associate):
                return getattr(obj, 'user_id', None) == request.user.id
            return False

        if request.method == 'DELETE':
            from .models.identity import User, Associate

            target_role = None
            if isinstance(obj, User):
                target_role = getattr(obj, 'role', None)
            elif isinstance(obj, Associate) and getattr(obj, 'user', None):
                target_role = getattr(obj.user, 'role', None)

            if role == ROLE_TREASURER and target_role == ROLE_ADMIN:
                return False

        if getattr(request.user, 'is_superuser', False):
            return True

        return role in ELEVATED_ROLES
