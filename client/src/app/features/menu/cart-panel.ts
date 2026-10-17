import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import type { CartChange } from '@pecan/shared';
import { Store } from '@ngrx/store';
import { centsToInput, formatMoney, parseMoney } from '../../shared/money';
import { MoneyPipe } from '../../shared/money.pipe';
import { CartActions, CheckoutActions } from '../../state/cart/cart.actions';
import { cartFeature } from '../../state/cart/cart.feature';
import { MAX_QUANTITY } from '../../state/cart/cart.logic';
import type { CartLine } from '../../state/cart/cart.logic';

@Component({
  selector: 'app-cart-panel',
  imports: [
    MatButton,
    MatIconButton,
    MatFormField,
    MatHint,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MatProgressSpinner,
    MoneyPipe,
  ],
  templateUrl: './cart-panel.html',
  styleUrl: './cart-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPanel {
  private readonly store = inject(Store);

  protected readonly maxQuantity = MAX_QUANTITY;
  protected readonly lines = this.store.selectSignal(cartFeature.selectLines);
  protected readonly itemCount = this.store.selectSignal(cartFeature.selectItemCount);
  protected readonly subtotal = this.store.selectSignal(cartFeature.selectSubtotal);
  protected readonly discount = this.store.selectSignal(cartFeature.selectDiscount);
  protected readonly appliedDiscount = this.store.selectSignal(cartFeature.selectAppliedDiscount);
  protected readonly total = this.store.selectSignal(cartFeature.selectTotal);
  protected readonly checkout = this.store.selectSignal(cartFeature.selectCheckout);
  protected readonly liveChanges = this.store.selectSignal(cartFeature.selectLiveChanges);
  protected readonly changesByItem = this.store.selectSignal(cartFeature.selectChangesByItem);

  protected readonly locked = this.store.selectSignal(cartFeature.selectCartLocked);
  protected readonly busy = computed(() => this.checkout().status === 'submitting');
  protected readonly failed = computed(() => this.checkout().status === 'failed');
  protected readonly discountText = computed(() =>
    this.discount() ? centsToInput(this.discount()) : '',
  );
  protected readonly discountCapped = computed(() => this.discount() > this.subtotal());
  protected readonly discountInvalid = signal(false);

  protected setQuantity(line: CartLine, quantity: number): void {
    this.store.dispatch(CartActions.quantityChanged({ lineKey: line.key, quantity }));
  }

  protected remove(line: CartLine): void {
    this.store.dispatch(CartActions.lineRemoved({ lineKey: line.key }));
  }

  protected applyDiscount(text: string): void {
    const cents = text.trim() ? parseMoney(text) : 0;
    this.discountInvalid.set(cents === null);
    if (cents !== null) this.store.dispatch(CartActions.discountChanged({ discount: cents }));
  }

  protected placeOrder(): void {
    this.store.dispatch(CheckoutActions.confirmed());
  }

  protected describe(change: CartChange): string {
    switch (change.kind) {
      case 'removed':
        return 'Removed from the menu';
      case 'unavailable':
        return 'No longer available';
      case 'priceChanged':
        return `Price changed to ${formatMoney(change.actual)}`;
    }
  }
}
