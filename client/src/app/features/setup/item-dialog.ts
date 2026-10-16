import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type { Category, MenuItem, MenuItemInput } from '@pecan/shared';
import { MenuApi } from '../../core/api/menu-api.service';
import type { AppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifier';
import { centsToInput, parseMoney } from '../../shared/money';
import { moneyValidator } from '../../shared/money-validator';

export interface ItemDialogData {
  item?: MenuItem;
  categories: Category[];
  categoryId?: string | null;
}

/** Saves through the API itself: it closes on success and keeps the form open on an error. */
@Component({
  selector: 'app-item-dialog',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatCheckbox,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatError,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit item' : 'New item' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="80" />
          <mat-error>A name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" maxlength="300" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            @for (category of data.categories; track category.id) {
              <mat-option [value]="category.id">{{ category.name }}</mat-option>
            }
          </mat-select>
          <mat-error>Pick a category</mat-error>
        </mat-form-field>

        <mat-checkbox formControlName="openPrice">
          Open price (entered when the item is added to an order)
        </mat-checkbox>

        <mat-form-field appearance="outline">
          <mat-label>Price</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput inputmode="decimal" autocomplete="off" formControlName="price" />
          <mat-error>Enter a price such as 12.50</mat-error>
        </mat-form-field>

        <mat-slide-toggle formControlName="available">Available</mat-slide-toggle>

        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields {
      display: grid;
      gap: 4px;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDialog {
  protected readonly data = inject<ItemDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ItemDialog, boolean>>(MatDialogRef);
  private readonly api = inject(MenuApi);
  private readonly notifier = inject(Notifier);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl(this.data.item?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    description: new FormControl(this.data.item?.description ?? '', { nonNullable: true }),
    categoryId: new FormControl(this.data.item?.categoryId ?? this.data.categoryId ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    openPrice: new FormControl(this.data.item?.openPrice ?? false, { nonNullable: true }),
    price: new FormControl(centsToInput(this.data.item?.price ?? null), {
      nonNullable: true,
      validators: [Validators.required, moneyValidator()],
    }),
    available: new FormControl(this.data.item?.available ?? true, { nonNullable: true }),
  });

  constructor() {
    this.syncPriceControl(this.form.controls.openPrice.value);
    this.form.controls.openPrice.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((openPrice) => this.syncPriceControl(openPrice));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: MenuItemInput = {
      categoryId: value.categoryId,
      name: value.name.trim(),
      description: value.description.trim(),
      openPrice: value.openPrice,
      price: value.openPrice ? null : parseMoney(value.price),
      available: value.available,
    };
    const request = this.data.item
      ? this.api.updateItem(this.data.item.id, input)
      : this.api.createItem(input);

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.notifier.success(`Saved "${input.name}"`);
        this.dialogRef.close(true);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.error.set(error.message);
      },
    });
  }

  private syncPriceControl(openPrice: boolean): void {
    const price = this.form.controls.price;
    if (openPrice) {
      price.disable({ emitEvent: false });
    } else {
      price.enable({ emitEvent: false });
    }
  }
}
