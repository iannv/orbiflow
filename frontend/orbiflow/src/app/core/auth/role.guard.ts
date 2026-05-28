import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from './auth.models';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data && (route.data as any).roles) as UserRole[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const role = authService.currentUser()?.role as UserRole | undefined;

  // Admin siempre puede
  if (role === 'admin') return true;

  if (role && allowedRoles.includes(role)) {
    return true;
  }

  return router.createUrlTree(['/panel']);
};
