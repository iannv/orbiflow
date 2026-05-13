import { Routes } from '@angular/router';

import { ModalShowcase } from './pages/modal-showcase/modal-showcase';

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
    path: 'modal-showcase',
    component: ModalShowcase,
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
