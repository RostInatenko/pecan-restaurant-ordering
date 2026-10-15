import type { Cents } from './money.js';

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderLineInput {
  itemId: string;
  quantity: number;
  /** The price the customer saw (or entered, for open-price items). The server rejects a mismatch. */
  unitPrice: Cents;
}

/** Sent with an `Idempotency-Key` header. */
export interface PlaceOrderRequest {
  lines: OrderLineInput[];
  discount: Cents;
}

export interface OrderLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: Cents;
  lineTotal: Cents;
}

export interface Order {
  id: string;
  number: number;
  lines: OrderLine[];
  subtotal: Cents;
  discount: Cents;
  total: Cents;
  status: OrderStatus;
  createdAt: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}
