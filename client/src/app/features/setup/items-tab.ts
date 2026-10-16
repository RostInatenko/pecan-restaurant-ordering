import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type { MatSlideToggleChange } from '@angular/material/slide-toggle';
import type { MenuItem } from '@pecan/shared';
import { Store } from '@ngrx/store';
import { debounceTime, filter, switchMap } from 'rxjs';
import { MenuApi } from '../../core/api/menu-api.service';
import type { AppError } from '../../core/http/app-error';
import { Notifier } from '../../core/notifier';
import { confirmAction } from '../../shared/confirm-dialog';
import { MoneyPipe } from '../../shared/money.pipe';
import { SkeletonRows } from '../../shared/skeleton-rows';
import { menuFeature } from '../../state/menu/menu.feature';
import { ItemDialog } from './item-dialog';
import type { ItemDialogData } from './item-dialog';

const ROW_HEIGHT = 56;

@Component({
  selector: 'app-items-tab',
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    DecimalPipe,
    MatButton,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MoneyPipe,
    SkeletonRows,
  ],
  template: `
    <div class="toolbar">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
        <mat-label>Search items</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input #search matInput type="search" (input)="query.set(search.value)" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="category">
        <mat-label>Category</mat-label>
        <mat-select [value]="categoryId()" (valueChange)="categoryId.set($event)">
          <mat-option [value]="null">All categories</mat-option>
          @for (category of categories(); track category.id) {
            <mat-option [value]="category.id">{{ category.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button mat-flat-button type="button" (click)="edit()">
        <mat-icon>add</mat-icon>
        New item
      </button>
    </div>
    <p class="count">
      @if (loaded()) {
        {{ items().length | number }} items
      }
    </p>

    @if (!loaded()) {
      <app-skeleton-rows [count]="10" [height]="rowHeight" />
    } @else {
      <cdk-virtual-scroll-viewport class="list" [itemSize]="rowHeight">
        <div *cdkVirtualFor="let item of items(); trackBy: trackById" class="row">
          <div class="text">
            <span class="name">{{ item.name }}</span>
            <span class="meta">{{ categoryNames()[item.categoryId] }}</span>
          </div>
          <span class="price">
            {{ item.openPrice ? 'Open price' : (item.price | money) }}
          </span>
          <mat-slide-toggle
            [checked]="item.available"
            [attr.aria-label]="'Available: ' + item.name"
            (change)="setAvailable(item, $event)"
          />
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Edit ' + item.name"
            (click)="edit(item)"
          >
            <mat-icon>edit</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Delete ' + item.name"
            (click)="remove(item)"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </cdk-virtual-scroll-viewport>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      box-sizing: border-box;
      height: 100%;
      padding: 16px 0 0;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .search {
      flex: 1 1 220px;
    }
    .category {
      flex: 0 1 220px;
    }
    .count {
      margin: 8px 0;
      height: 20px;
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .list {
      height: 100%;
    }
    .row {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto auto auto;
      align-items: center;
      gap: 8px;
      height: 56px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name {
      font: var(--mat-sys-title-small);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .price {
      text-align: right;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsTab {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(MenuApi);
  private readonly notifier = inject(Notifier);

  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly loaded = this.store.selectSignal(menuFeature.selectLoaded);
  protected readonly categories = this.store.selectSignal(menuFeature.selectAllCategories);
  private readonly allItems = this.store.selectSignal(menuFeature.selectSortedItems);

  /** Local UI state: unlike the menu page's filter, nothing else in the app needs it. */
  protected readonly query = signal('');
  protected readonly categoryId = signal<string | null>(null);
  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(150)), {
    initialValue: '',
  });

  protected readonly categoryNames = computed(() =>
    Object.fromEntries(this.categories().map((category) => [category.id, category.name])),
  );

  protected readonly items = computed(() => {
    const needle = this.debouncedQuery().trim().toLowerCase();
    const categoryId = this.categoryId();
    return this.allItems().filter(
      (item) =>
        (!categoryId || item.categoryId === categoryId) &&
        (!needle || item.name.toLowerCase().includes(needle)),
    );
  });

  protected edit(item?: MenuItem): void {
    this.dialog.open<ItemDialog, ItemDialogData>(ItemDialog, {
      data: { item, categories: this.categories(), categoryId: this.categoryId() },
      width: '480px',
    });
  }

  /** The toggle flips immediately; the store (and so the toggle) follows the WebSocket event. */
  protected setAvailable(item: MenuItem, change: MatSlideToggleChange): void {
    this.api.updateItem(item.id, { available: change.checked }).subscribe({
      error: (error: AppError) => {
        change.source.checked = item.available;
        this.notifier.error(error.message);
      },
    });
  }

  protected remove(item: MenuItem): void {
    confirmAction(this.dialog, {
      title: 'Delete item?',
      message: `"${item.name}" will disappear from the menu for everyone.`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.deleteItem(item.id)),
      )
      .subscribe({
        next: () => this.notifier.success(`Deleted "${item.name}"`),
        error: (error: AppError) => this.notifier.error(error.message),
      });
  }

  protected readonly trackById = (_: number, item: MenuItem): string => item.id;
}
