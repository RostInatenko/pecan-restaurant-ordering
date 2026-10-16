import type { Category, MenuItem } from '@pecan/shared';
import { createEntityAdapter } from '@ngrx/entity';
import type { EntityState } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { RealtimeActions } from '../realtime.actions';
import { MenuPageActions } from './menu.actions';

export interface MenuState {
  categories: EntityState<Category>;
  items: EntityState<MenuItem>;
  /** False until the first snapshot arrives; the UI shows skeletons until then. */
  loaded: boolean;
  query: string;
  categoryId: string | null;
}

const categoryAdapter = createEntityAdapter<Category>({
  sortComparer: (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
});
const itemAdapter = createEntityAdapter<MenuItem>();

const initialState: MenuState = {
  categories: categoryAdapter.getInitialState(),
  items: itemAdapter.getInitialState(),
  loaded: false,
  query: '',
  categoryId: null,
};

export const menuFeature = createFeature({
  name: 'menu',
  reducer: createReducer(
    initialState,
    on(RealtimeActions.snapshotReceived, (state, { menu }): MenuState => ({
      ...state,
      categories: categoryAdapter.setAll(menu.categories, state.categories),
      items: itemAdapter.setAll(menu.items, state.items),
      loaded: true,
      categoryId: menu.categories.some((c) => c.id === state.categoryId) ? state.categoryId : null,
    })),
    on(RealtimeActions.categoryUpserted, (state, { category }): MenuState => ({
      ...state,
      categories: categoryAdapter.upsertOne(category, state.categories),
    })),
    on(RealtimeActions.categoryDeleted, (state, { id }): MenuState => ({
      ...state,
      categories: categoryAdapter.removeOne(id, state.categories),
      categoryId: state.categoryId === id ? null : state.categoryId,
    })),
    on(RealtimeActions.itemUpserted, (state, { item }): MenuState => ({
      ...state,
      items: itemAdapter.upsertOne(item, state.items),
    })),
    on(RealtimeActions.itemDeleted, (state, { id }): MenuState => ({
      ...state,
      items: itemAdapter.removeOne(id, state.items),
    })),
    on(MenuPageActions.queryChanged, (state, { query }): MenuState => ({ ...state, query })),
    on(MenuPageActions.categorySelected, (state, { categoryId }): MenuState => ({
      ...state,
      categoryId,
    })),
  ),
  extraSelectors: ({ selectCategories, selectItems, selectQuery, selectCategoryId }) => {
    const selectAllCategories = createSelector(
      selectCategories,
      categoryAdapter.getSelectors().selectAll,
    );
    const selectAllItems = createSelector(selectItems, itemAdapter.getSelectors().selectAll);
    const selectItemEntities = createSelector(selectItems, (items) => items.entities);

    /** Items in menu order: by category position, then name. Recomputed only when data changes. */
    const selectSortedItems = createSelector(
      selectAllItems,
      selectAllCategories,
      (items, categories) => {
        const position = new Map(categories.map((category, index) => [category.id, index]));
        return [...items].sort(
          (a, b) =>
            (position.get(a.categoryId) ?? Infinity) - (position.get(b.categoryId) ?? Infinity) ||
            a.name.localeCompare(b.name),
        );
      },
    );

    const selectVisibleItems = createSelector(
      selectSortedItems,
      selectQuery,
      selectCategoryId,
      (items, query, categoryId) => {
        const needle = query.trim().toLowerCase();
        if (!needle && !categoryId) return items;
        return items.filter(
          (item) =>
            (!categoryId || item.categoryId === categoryId) &&
            (!needle || item.name.toLowerCase().includes(needle)),
        );
      },
    );

    return {
      selectAllCategories,
      selectAllItems,
      selectItemEntities,
      selectSortedItems,
      selectVisibleItems,
    };
  },
});
