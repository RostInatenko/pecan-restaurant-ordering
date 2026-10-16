import type { OrderStatus, UpdateOrderStatusRequest } from '@pecan/shared';
import { IsIn } from 'class-validator';

/** A `Record` over the union fails to compile if a status is added to the contract but not here. */
const STATUSES: Record<OrderStatus, true> = {
  received: true,
  preparing: true,
  ready: true,
  completed: true,
  cancelled: true,
};

export class UpdateOrderStatusDto implements UpdateOrderStatusRequest {
  @IsIn(Object.keys(STATUSES))
  status: OrderStatus;
}
