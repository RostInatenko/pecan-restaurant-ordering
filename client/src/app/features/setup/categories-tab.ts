import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import type { Category } from '@pecan/shared';
import { Store } from '@ngrx/store';
import { filter, switchMap } from 'rxjs';
import { MenuApi } from '../../core/api/menu-api.service';
import type { AppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifier';
import { confirmAction } from '../../shared/confirm-dialog';
import { menuFeature } from '../../state/menu/menu.feature';
import { CategoryDialog } from './category-dialog';
import type { CategoryDialogData } from './category-dialog';

@Component({
  selector: 'app-categories-tab',
  imports: [MatButton, MatIconButton, MatIcon],
  template: `
    <div class="toolbar">
      <button mat-flat-button type="button" (click)="edit()">
        <mat-icon>add</mat-icon>
        New category
      </button>
    </div>
    <ul class="list">
      @for (category of categories(); track category.id) {
        <li class="row">
          <span class="position">{{ category.sortOrder }}</span>
          <span class="name">{{ category.name }}</span>
          <span class="meta">{{ itemCounts()[category.id] ?? 0 }} items</span>
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Edit ' + category.name"
            (click)="edit(category)"
          >
            <mat-icon>edit</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Delete ' + category.name"
            (click)="remove(category)"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px 0;
    }
    .list {
      list-style: none;
      padding: 0;
    }
    .row {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr) auto auto auto;
      align-items: center;
      gap: 8px;
      min-height: 56px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .position,
    .meta {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .name {
      font: var(--mat-sys-title-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesTab {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(MenuApi);
  private readonly notifier = inject(Notifier);

  protected readonly categories = this.store.selectSignal(menuFeature.selectAllCategories);
  private readonly items = this.store.selectSignal(menuFeature.selectAllItems);

  protected readonly itemCounts = computed(() => {
    const counts: Record<string, number | undefined> = {};
    for (const item of this.items()) counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    return counts;
  });

  protected edit(category?: Category): void {
    const nextSortOrder = Math.max(-1, ...this.categories().map((c) => c.sortOrder)) + 1;
    this.dialog.open<CategoryDialog, CategoryDialogData>(CategoryDialog, {
      data: { category, nextSortOrder },
      width: '400px',
    });
  }

  protected remove(category: Category): void {
    confirmAction(this.dialog, {
      title: 'Delete category?',
      message: `"${category.name}" can only be deleted once it has no items.`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.deleteCategory(category.id)),
      )
      .subscribe({
        next: () => this.notifier.success(`Deleted "${category.name}"`),
        error: (error: AppError) => this.notifier.error(error.message),
      });
  }
}
