import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

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
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer', 'associate'] },
  },

  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
  },

  {
    path: 'modulos',
    loadComponent: () => import('./pages/modulos/modulos').then((m) => m.Modulos),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
  },

  {
    path: 'configuracion-general',
    loadComponent: () =>
      import('./pages/configuracion-general/configuracion-general').then(
        (m) => m.ConfiguracionGeneral,
      ),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer'] },
  },

  {
    path: 'perfil',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer', 'associate'] },
  },

  {
    path: 'recibos',
    loadComponent: () => import('./pages/recibos/recibos').then((m) => m.Recibos),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer', 'associate'] },
  },

  {
    path: 'asociados',
    loadComponent: () => import('./pages/asociados/page-asociados').then((m) => m.PageAsociados),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer'] },
  },

  {
    path: 'liquidaciones',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/liquidations/liquidations-hub/liquidations-hub').then(
            (m) => m.LiquidationsHub,
          ),
      },
      {
        path: 'pre-liquidation',
        loadComponent: () =>
          import('./pages/liquidations/pre-liquidation/pre-liquidation').then(
            (m) => m.PreLiquidationComponent,
          ),
      },
      {
        path: 'liquidation',
        loadComponent: () =>
          import('./pages/liquidations/liquidation/liquidation').then(
            (m) => m.LiquidationComponent,
          ),
      },

      {
        path: 'closed-liquidations',
        loadComponent: () =>
          import('./pages/liquidations/closed-liquidations/closed-liquidations').then(
            (m) => m.ClosedLiquidationsComponent,
          ),
      },
    ],
  },

  { path: 'archivo-cooperativo', 
    loadComponent: () => import('./pages/archivo-cooperativo/archivo-cooperativo')
    .then(m => m.ArchivoCooperativo), 
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'treasurer', 'associate'] } },

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
