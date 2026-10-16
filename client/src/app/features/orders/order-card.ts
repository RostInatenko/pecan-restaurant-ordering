import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Order } from '@pecan/shared';
import { MoneyPipe } from '../../shared/money.pipe';
import { ORDER_PROGRESS, ORDER_STATUS_LABELS } from '../../shared/order-status';

@Component({
  selector: 'app-order-card',
  imports: [DatePipe, MoneyPipe],
  template: `
    <header class="header">
      <h3>Order #{{ order().number }}</h3>
      <time [attr.datetime]="order().createdAt">{{ order().createdAt | date: 'shortTime' }}</time>
      <span class="status" [attr.data-status]="order().status" aria-live="polite">
        {{ statusLabel() }}
      </span>
    </header>

    @if (order().status !== 'cancelled') {
      <ol class="progress" [attr.aria-label]="'Progress: ' + statusLabel()">
        @for (step of steps; track step; let index = $index) {
          <li [class.done]="index <= stepIndex()"></li>
        }
      </ol>
    }

    <ul class="lines">
      @for (line of order().lines; track $index) {
        <li>
          <span>{{ line.quantity }} × {{ line.name }}</span>
          <span>{{ line.lineTotal | money }}</span>
        </li>
      }
    </ul>

    <footer class="totals">
      @if (order().discount) {
        <span>Discount −{{ order().discount | money }}</span>
      }
      <strong>Total {{ order().total | money }}</strong>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    h3 {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    time {
      color: var(--mat-sys-on-surface-variant);
      flex: 1;
    }
    .status {
      padding: 4px 12px;
      border-radius: 16px;
      font: var(--mat-sys-label-large);
      background: var(--mat-sys-surface-container-highest);
      transition: background-color 300ms ease;
    }
    .status[data-status='preparing'] {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .status[data-status='ready'] {
      background: #c8e6c9;
      color: #1b5e20;
    }
    .status[data-status='cancelled'] {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .progress {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      list-style: none;
      padding: 0;
      margin: 12px 0;
    }
    .progress li {
      height: 6px;
      border-radius: 3px;
      background: var(--mat-sys-surface-container-highest);
      transition: background-color 300ms ease;
    }
    .progress li.done {
      background: var(--mat-sys-primary);
    }
    .lines {
      list-style: none;
      padding: 0;
      margin: 8px 0;
      font: var(--mat-sys-body-medium);
    }
    .lines li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 2px 0;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    .totals strong {
      color: var(--mat-sys-on-surface);
    }
    @media (prefers-reduced-motion: reduce) {
      .status,
      .progress li {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCard {
  readonly order = input.required<Order>();

  protected readonly steps = ORDER_PROGRESS;
  protected readonly statusLabel = computed(() => ORDER_STATUS_LABELS[this.order().status]);
  protected readonly stepIndex = computed(() => ORDER_PROGRESS.indexOf(this.order().status));
}
