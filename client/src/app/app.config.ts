import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { connectionFeature } from './state/connection/connection.feature';
import { menuFeature } from './state/menu/menu.feature';
import { ordersFeature } from './state/orders/orders.feature';
import { RealtimeEffects } from './state/realtime.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    provideStore(
      {},
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictStateSerializability: true,
          strictActionSerializability: true,
          strictActionTypeUniqueness: true,
        },
      },
    ),
    provideState(connectionFeature),
    provideState(menuFeature),
    provideState(ordersFeature),
    provideEffects(RealtimeEffects),
    provideStoreDevtools({ maxAge: 50, logOnly: !isDevMode() }),
  ],
};
