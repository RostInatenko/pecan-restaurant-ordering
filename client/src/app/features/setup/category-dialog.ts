import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { Category, CategoryInput } from '@pecan/shared';
import { MenuApi } from '../../core/api/menu-api.service';
import type { AppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifier';

export interface CategoryDialogData {
  category?: Category;
  nextSortOrder: number;
}

@Component({
  selector: 'app-category-dialog',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatError,
    MatFormField,
    MatHint,
    MatLabel,
    MatInput,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.category ? 'Edit category' : 'New category' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="60" />
          <mat-error>A name is required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Position</mat-label>
          <input matInput type="number" min="0" formControlName="sortOrder" />
          <mat-hint>Lower numbers come first on the menu</mat-hint>
          <mat-error>0 or more</mat-error>
        </mat-form-field>
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
export class CategoryDialog {
  protected readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<CategoryDialog, boolean>>(MatDialogRef);
  private readonly api = inject(MenuApi);
  private readonly notifier = inject(Notifier);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl(this.data.category?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    sortOrder: new FormControl(this.data.category?.sortOrder ?? this.data.nextSortOrder, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: CategoryInput = {
      name: value.name.trim(),
      sortOrder: Math.floor(value.sortOrder),
    };
    const request = this.data.category
      ? this.api.updateCategory(this.data.category.id, input)
      : this.api.createCategory(input);

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
}
