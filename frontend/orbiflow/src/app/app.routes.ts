import { Routes } from '@angular/router';
import { PanelPrincipal } from './pages/panel-principal/panel-principal';

export const routes: Routes = [
  { path: '', redirectTo: '/panel-principal', pathMatch: 'full' },
  { path: '**', component: PanelPrincipal },
  { path: 'panel-principal', component: PanelPrincipal },
];
