import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import type { CartChange } from '@pecan/shared';
import { MoneyPipe } from '../../shared/money.pipe';
import type { CartLine } from '../../state/cart/cart.logic';

export interface CheckoutReviewData {
  changes: CartChange[];
  lines: CartLine[];
}

/** Closes with `true` when the user accepts the changes, anything else means "back to cart". */
@Component({
  selector: 'app-checkout-review-dialog',
  imports: [
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatIcon,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>The menu changed</h2>
    <mat-dialog-content>
      <p>Before we place your order, please check these changes:</p>
      <ul class="changes">
        @for (change of data.changes; track change.itemId) {
          <li>
            <mat-icon>{{ change.kind === 'priceChanged' ? 'sell' : 'block' }}</mat-icon>
            <span>
              <strong>{{ nameOf(change) }}</strong>
              @switch (change.kind) {
                @case ('priceChanged') {
                  now costs {{ change.actual | money }} (was {{ change.expected | money }})
                }
                @case ('unavailable') {
                  is no longer available and will be removed
                }
                @case ('removed') {
                  was taken off the menu and will be removed
                }
              }
            </span>
          </li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Back to cart</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true">Update my cart</button>
    </mat-dialog-actions>
  `,
  styles: `
    .changes {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 12px;
    }
    li {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutReviewDialog {
  protected readonly data = inject<CheckoutReviewData>(MAT_DIALOG_DATA);

  protected nameOf(change: CartChange): string {
    if (change.kind !== 'removed') return change.name;
    return this.data.lines.find((line) => line.itemId === change.itemId)?.name ?? 'An item';
  }
}
