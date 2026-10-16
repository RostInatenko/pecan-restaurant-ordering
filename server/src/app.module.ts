import { Module, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApiException } from './common/api-exception.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { MenuModule } from './menu/menu.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';

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
  imports: [MenuModule, OrdersModule, RealtimeModule],
  providers: [
    { provide: APP_PIPE, useValue: validationPipe },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
