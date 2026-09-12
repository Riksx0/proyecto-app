import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard'; // <-- Importa el guard

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
    canActivate: [authGuard] // <-- Bloquea el acceso a todas las pestañas[cite: 4]
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage) //[cite: 4]
  },
];