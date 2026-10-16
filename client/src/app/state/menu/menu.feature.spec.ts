import type { MenuItem, MenuSnapshot } from '@pecan/shared';
import { RealtimeActions } from '../realtime.actions';
import { MenuPageActions } from './menu.actions';
import { menuFeature } from './menu.feature';
import type { MenuState } from './menu.feature';

const item = (id: string, categoryId: string, name: string): MenuItem => ({
  id,
  categoryId,
  name,
  description: '',
  price: 500,
  openPrice: false,
  available: true,
});

const snapshot: MenuSnapshot = {
  categories: [
    { id: 'drinks', name: 'Drinks', sortOrder: 1 },
    { id: 'food', name: 'Food', sortOrder: 0 },
  ],
  items: [item('1', 'drinks', 'Cola'), item('2', 'food', 'Taco'), item('3', 'food', 'Burger')],
};

const reduce = (...actions: Parameters<typeof menuFeature.reducer>[1][]): MenuState =>
  actions.reduce(menuFeature.reducer, menuFeature.reducer(undefined, { type: '@@init' }));

const visible = (state: MenuState) =>
  menuFeature.selectVisibleItems({ menu: state }).map((menuItem) => menuItem.name);

describe('menu feature', () => {
  it('is not loaded until the first snapshot arrives', () => {
    expect(reduce().loaded).toBe(false);
    expect(reduce(RealtimeActions.snapshotReceived({ menu: snapshot, orders: [] })).loaded).toBe(
      true,
    );
  });

  it('lists items by category position, then name', () => {
    const state = reduce(RealtimeActions.snapshotReceived({ menu: snapshot, orders: [] }));
    expect(visible(state)).toEqual(['Burger', 'Taco', 'Cola']);
  });

  it('applies live upserts and deletions on top of the snapshot', () => {
    const state = reduce(
      RealtimeActions.snapshotReceived({ menu: snapshot, orders: [] }),
      RealtimeActions.itemUpserted({ item: { ...item('2', 'food', 'Taco'), available: false } }),
      RealtimeActions.itemDeleted({ id: '1' }),
    );
    expect(state.items.entities['2']?.available).toBe(false);
    expect(visible(state)).toEqual(['Burger', 'Taco']);
  });

  it('a new snapshot replaces everything, so missed events cannot leave stale data', () => {
    const state = reduce(
      RealtimeActions.snapshotReceived({ menu: snapshot, orders: [] }),
      RealtimeActions.snapshotReceived({
        menu: { categories: snapshot.categories, items: [item('9', 'food', 'Soup')] },
        orders: [],
      }),
    );
    expect(visible(state)).toEqual(['Soup']);
  });

  it('filters by search text and category', () => {
    const state = reduce(
      RealtimeActions.snapshotReceived({ menu: snapshot, orders: [] }),
      MenuPageActions.categorySelected({ categoryId: 'food' }),
      MenuPageActions.queryChanged({ query: ' bur ' }),
    );
    expect(visible(state)).toEqual(['Burger']);
  });

  it('clears the category filter when that category is deleted', () => {
    const state = reduce(
      RealtimeActions.snapshotReceived({ menu: snapshot, orders: [] }),
      MenuPageActions.categorySelected({ categoryId: 'drinks' }),
      RealtimeActions.categoryDeleted({ id: 'drinks' }),
    );
    expect(state.categoryId).toBeNull();
  });
});
