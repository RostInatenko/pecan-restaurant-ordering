import type { OrderStatus } from '@pecan/shared';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_PROGRESS: readonly OrderStatus[] = [
  'received',
  'preparing',
  'ready',
  'completed',
];

export const NEXT_ORDER_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
  cancelled: null,
};
