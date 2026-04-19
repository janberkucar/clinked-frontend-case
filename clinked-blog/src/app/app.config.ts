/* Core Imports */
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
/* Router Imports */
import { provideRouter } from '@angular/router';
/* App routes */
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};
