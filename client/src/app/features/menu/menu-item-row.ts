import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { MenuItem } from '@pecan/shared';
import { MoneyPipe } from '../../shared/money.pipe';

export const MENU_ROW_HEIGHT = 72;

@Component({
  selector: 'app-menu-item-row',
  imports: [MatButton, MoneyPipe],
  template: `
    <div class="text">
      <div class="name">{{ item().name }}</div>
      <div class="description">{{ item().description }}</div>
    </div>
    <div class="price">
      @if (item().openPrice) {
        <span class="open">Open price</span>
      } @else {
        {{ item().price | money }}
      }
    </div>
    @if (item().available) {
      <button mat-stroked-button type="button" (click)="add.emit()">Add</button>
    } @else {
      <span class="unavailable">Unavailable</span>
    }
  `,
  styles: `
    :host {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 96px;
      align-items: center;
      gap: 12px;
      height: 72px;
      padding: 0 8px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .name {
      font: var(--mat-sys-title-small);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .description {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .price {
      font: var(--mat-sys-title-small);
      text-align: right;
    }
    .open {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-tertiary);
    }
    .unavailable {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-error);
      text-align: center;
    }
    :host(.unavailable-row) .text {
      opacity: 0.6;
    }
  `,
  host: { '[class.unavailable-row]': '!item().available' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemRow {
  readonly item = input.required<MenuItem>();
  readonly add = output();
}
