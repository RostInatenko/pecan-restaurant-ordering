import { Body, Controller, Get, Headers, Param, Patch, Post, Res } from '@nestjs/common';
import type { Order } from '@pecan/shared';
import type { Response } from 'express';
import { ApiException } from '../common/api-exception.js';
import { PlaceOrderDto } from './dto/place-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrdersService } from './orders.service.js';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9-]{8,100}$/;

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(): Order[] {
    return this.orders.list();
  }

  @Post()
  place(
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: PlaceOrderDto,
    @Res({ passthrough: true }) response: Response,
  ): Order {
    if (!key || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw new ApiException('VALIDATION', 'A valid Idempotency-Key header is required');
    }
    const { order, replayed } = this.orders.place(key, dto);
    if (replayed) response.setHeader('Idempotent-Replayed', 'true');
    return order;
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto): Order {
    return this.orders.updateStatus(id, dto.status);
  }
}
