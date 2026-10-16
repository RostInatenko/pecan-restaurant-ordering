import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

const CLIENT_DIST = fileURLToPath(new URL('../../client/dist/client/browser', import.meta.url));

/**
 * Serves the built Angular app from the same origin as the API (`npm run serve`). In development
 * `ng serve` does this instead, so the module is only added when a client build exists.
 */
export function staticClientModules(): DynamicModule[] {
  if (!existsSync(join(CLIENT_DIST, 'index.html'))) return [];
  return [ServeStaticModule.forRoot({ rootPath: CLIENT_DIST, exclude: ['/api/{*path}'] })];
}
