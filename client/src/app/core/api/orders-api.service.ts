import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Order, OrderStatus, PlaceOrderRequest } from '@pecan/shared';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);

  /** Safe to retry with the same key: the server returns the original order instead of a copy. */
  place(idempotencyKey: string, request: PlaceOrderRequest): Observable<Order> {
    return this.http.post<Order>('/api/orders', request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/orders/${encodeURIComponent(id)}/status`, { status });
  }
}
