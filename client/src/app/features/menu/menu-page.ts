import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type { MenuItem } from '@pecan/shared';
import { Store } from '@ngrx/store';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { SkeletonRows } from '../../shared/skeleton-rows';
import { MenuPageActions } from '../../state/menu/menu.actions';
import { menuFeature } from '../../state/menu/menu.feature';
import { MENU_ROW_HEIGHT, MenuItemRow } from './menu-item-row';

@Component({
  selector: 'app-menu-page',
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    DecimalPipe,
    MatChipListbox,
    MatChipOption,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MenuItemRow,
    SkeletonRows,
  ],
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  private readonly store = inject(Store);
  private readonly queryInput = new Subject<string>();

  protected readonly rowHeight = MENU_ROW_HEIGHT;
  protected readonly loaded = this.store.selectSignal(menuFeature.selectLoaded);
  protected readonly categories = this.store.selectSignal(menuFeature.selectAllCategories);
  protected readonly items = this.store.selectSignal(menuFeature.selectVisibleItems);
  protected readonly query = this.store.selectSignal(menuFeature.selectQuery);
  protected readonly categoryId = this.store.selectSignal(menuFeature.selectCategoryId);

  constructor() {
    // The input updates instantly; filtering 5,000 items waits for a short pause in typing.
    this.queryInput
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => this.store.dispatch(MenuPageActions.queryChanged({ query })));
  }

  protected onSearch(query: string): void {
    this.queryInput.next(query);
  }

  protected selectCategory(categoryId: string | null | undefined): void {
    this.store.dispatch(MenuPageActions.categorySelected({ categoryId: categoryId || null }));
  }

  protected readonly trackById = (_: number, item: MenuItem): string => item.id;
}
