import type { Routes } from '@angular/router';

/** Each page is its own lazy chunk, so the first load only ships the shell and the store. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'menu' },
  {
    path: 'menu',
    title: 'Menu · Restaurant Ordering',
    loadComponent: () => import('./features/menu/menu-page').then((m) => m.MenuPage),
  },
  {
    path: 'orders',
    title: 'Orders · Restaurant Ordering',
    loadComponent: () => import('./features/orders/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'setup',
    title: 'Setup · Restaurant Ordering',
    loadComponent: () => import('./features/setup/setup-page').then((m) => m.SetupPage),
  },
  { path: '**', redirectTo: 'menu' },
];
