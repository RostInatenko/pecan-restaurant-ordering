import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type { Cents, MenuItem } from '@pecan/shared';
import { MAX_QUANTITY } from '../../state/cart/cart.logic';
import { parseMoney } from '../../shared/money';
import { MoneyPipe } from '../../shared/money.pipe';
import { moneyValidator } from '../../shared/money-validator';

export interface AddToCartResult {
  quantity: number;
  unitPrice: Cents;
}

@Component({
  selector: 'app-add-to-cart-dialog',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatIconButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatPrefix,
    MatIcon,
    MatInput,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ item.name }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <p class="description">{{ item.description }}</p>

        <div class="quantity">
          <button mat-icon-button type="button" aria-label="Decrease quantity" (click)="step(-1)">
            <mat-icon>remove</mat-icon>
          </button>
          <mat-form-field appearance="outline" class="quantity-field">
            <mat-label>Quantity</mat-label>
            <input matInput type="number" min="1" [max]="maxQuantity" formControlName="quantity" />
            <mat-error>1 to {{ maxQuantity }}</mat-error>
          </mat-form-field>
          <button mat-icon-button type="button" aria-label="Increase quantity" (click)="step(1)">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        @if (item.openPrice) {
          <mat-form-field appearance="outline" class="price-field">
            <mat-label>Price</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput inputmode="decimal" autocomplete="off" formControlName="price" />
            <mat-hint>Open-price item: enter the agreed price</mat-hint>
            <mat-error>Enter a price such as 12.50</mat-error>
          </mat-form-field>
        } @else {
          <p>{{ item.price | money }} each</p>
        }

        <p class="total">
          Line total: <strong>{{ lineTotal() | money }}</strong>
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit">Add to order</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .description {
      color: var(--mat-sys-on-surface-variant);
    }
    .quantity {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .quantity-field {
      width: 120px;
    }
    .price-field {
      width: 100%;
    }
    .total {
      margin-bottom: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddToCartDialog {
  protected readonly item = inject<MenuItem>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<AddToCartDialog, AddToCartResult>>(MatDialogRef);

  protected readonly maxQuantity = MAX_QUANTITY;
  protected readonly form = new FormGroup({
    quantity: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(MAX_QUANTITY)],
    }),
    price: new FormControl('', {
      nonNullable: true,
      validators: this.item.openPrice ? [Validators.required, moneyValidator(1)] : [],
    }),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  protected readonly lineTotal = computed(() => {
    const quantity = Math.floor(Number(this.value().quantity) || 0);
    return quantity * (this.unitPrice(this.value().price ?? '') ?? 0);
  });

  protected step(delta: number): void {
    const next = Math.floor(this.form.controls.quantity.value || 0) + delta;
    this.form.controls.quantity.setValue(Math.min(MAX_QUANTITY, Math.max(1, next)));
  }

  protected submit(): void {
    const unitPrice = this.unitPrice(this.form.controls.price.value);
    if (this.form.invalid || unitPrice === null) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ quantity: Math.floor(this.form.controls.quantity.value), unitPrice });
  }

  private unitPrice(priceText: string): Cents | null {
    return this.item.openPrice ? parseMoney(priceText) : this.item.price;
  }
}
