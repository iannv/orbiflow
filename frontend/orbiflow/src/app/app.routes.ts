import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

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
    path: 'modulos',
    loadComponent: () => import('./pages/modulos/modulos').then((m) => m.Modulos),
    canActivate: [authGuard],
  },

  {
    path: 'configuracion-general',
    loadComponent: () =>
      import('./pages/configuracion-general/configuracion-general').then(
        (m) => m.ConfiguracionGeneral,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },

  {
    path: 'recibos',
    loadComponent: () => import('./pages/recibos/recibos').then((m) => m.Recibos),
    canActivate: [authGuard],
  },

  {
    path: 'asociados',
    loadComponent: () => import('./pages/asociados/page-asociados').then((m) => m.PageAsociados),
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
