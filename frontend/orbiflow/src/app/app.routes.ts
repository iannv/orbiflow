import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { Usuarios } from './pages/usuarios/usuarios';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },

  {
    path: 'panel',
    loadComponent: () =>
      import('./pages/panel-principal/panel-principal').then((m) => m.PanelPrincipal),
    canActivate: [authGuard],
  },

  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
    canActivate: [authGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'panel',
  },

  {
    path: '**',
    redirectTo: 'panel',
  },
];
