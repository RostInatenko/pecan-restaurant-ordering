import { Module, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ChaosInterceptor } from './chaos/chaos.interceptor.js';
import { ChaosModule } from './chaos/chaos.module.js';
import { ApiException } from './common/api-exception.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { MenuModule } from './menu/menu.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { staticClientModules } from './static-client.js';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors: ValidationError[]) =>
    new ApiException(
      'VALIDATION',
      'The request contains invalid fields',
      errors.map(({ property, constraints }) => ({
        field: property,
        problems: Object.values(constraints ?? {}),
      })),
    ),
});

@Module({
  imports: [MenuModule, OrdersModule, RealtimeModule, ChaosModule, ...staticClientModules()],
  providers: [
    { provide: APP_PIPE, useValue: validationPipe },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useExisting: ChaosInterceptor },
  ],
})
export class AppModule {}
