import type { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import compression from 'compression';

/** Shared by `main.ts` and the e2e tests, so both run the app the same way. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(compression());
  return app;
}
