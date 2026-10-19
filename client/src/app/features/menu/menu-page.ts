import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type { CartChange, MenuItem } from '@pecan/shared';
import { Store } from '@ngrx/store';
import { Subject, debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { Notifier } from '../../core/notifier';
import { MoneyPipe } from '../../shared/money.pipe';
import { SkeletonRows } from '../../shared/skeleton-rows';
import { CartActions, CheckoutActions } from '../../state/cart/cart.actions';
import { cartFeature } from '../../state/cart/cart.feature';
import { MenuPageActions } from '../../state/menu/menu.actions';
import { menuFeature } from '../../state/menu/menu.feature';
import { AddToCartDialog } from './add-to-cart-dialog';
import type { AddToCartResult } from './add-to-cart-dialog';
import { CartPanel } from './cart-panel';
import { CheckoutReviewDialog } from './checkout-review-dialog';
import type { CheckoutReviewData } from './checkout-review-dialog';
import { MENU_ROW_HEIGHT, MenuItemRow } from './menu-item-row';

@Component({
  selector: 'app-menu-page',
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    DecimalPipe,
    MatButton,
    MatChipListbox,
    MatChipOption,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MoneyPipe,
    CartPanel,
    MenuItemRow,
    SkeletonRows,
  ],
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly queryInput = new Subject<string>();
  private reviewOpen = false;

  protected readonly rowHeight = MENU_ROW_HEIGHT;
  protected readonly loaded = this.store.selectSignal(menuFeature.selectLoaded);
  protected readonly categories = this.store.selectSignal(menuFeature.selectAllCategories);
  protected readonly items = this.store.selectSignal(menuFeature.selectVisibleItems);
  protected readonly query = this.store.selectSignal(menuFeature.selectQuery);
  protected readonly categoryId = this.store.selectSignal(menuFeature.selectCategoryId);
  protected readonly itemCount = this.store.selectSignal(cartFeature.selectItemCount);
  protected readonly total = this.store.selectSignal(cartFeature.selectTotal);
  private readonly cartLocked = this.store.selectSignal(cartFeature.selectCartLocked);
  private readonly checkout = this.store.selectSignal(cartFeature.selectCheckout);
  private readonly lines = this.store.selectSignal(cartFeature.selectLines);

  constructor() {
    // The input updates instantly; filtering 5,000 items waits for a short pause in typing.
    this.queryInput
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => this.store.dispatch(MenuPageActions.queryChanged({ query })));

    effect(() => {
      const { status, changes } = this.checkout();
      if (status === 'reviewing' && !this.reviewOpen) untracked(() => this.openReview(changes));
    });

    // Dialogs only close on history back/forward, not on router navigation such as the redirect
    // to Orders after checkout, which would leave the mobile cart dialog open over the next page.
    inject(DestroyRef).onDestroy(() => this.dialog.closeAll());
  }

  protected onSearch(query: string): void {
    this.queryInput.next(query);
  }

  protected selectCategory(categoryId: string | null | undefined): void {
    this.store.dispatch(MenuPageActions.categorySelected({ categoryId: categoryId || null }));
  }

  protected openAdd(item: MenuItem): void {
    if (this.cartLocked()) {
      this.notifier.error('Finish the pending order first: press Retry in your cart.');
      return;
    }
    this.dialog
      .open<AddToCartDialog, MenuItem, AddToCartResult>(AddToCartDialog, {
        data: item,
        width: '420px',
      })
      .afterClosed()
      // Cancel closes with an empty string (`mat-dialog-close` without a value), Esc with undefined.
      .pipe(
        filter(
          (result): result is AddToCartResult => typeof result === 'object' && result !== null,
        ),
      )
      .subscribe(({ quantity, unitPrice }) =>
        this.store.dispatch(CartActions.itemAdded({ item, quantity, unitPrice })),
      );
  }

  protected openCart(): void {
    this.dialog.open(CartPanel, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
    });
  }

  protected readonly trackById = (_: number, item: MenuItem): string => item.id;

  private openReview(changes: CartChange[]): void {
    this.reviewOpen = true;
    this.dialog
      .open<CheckoutReviewDialog, CheckoutReviewData, boolean>(CheckoutReviewDialog, {
        data: { changes, lines: this.lines() },
        width: '480px',
      })
      .afterClosed()
      .subscribe((accepted) => {
        this.reviewOpen = false;
        this.store.dispatch(
          accepted ? CheckoutActions.changesAccepted() : CheckoutActions.reviewDismissed(),
        );
      });
  }
}
