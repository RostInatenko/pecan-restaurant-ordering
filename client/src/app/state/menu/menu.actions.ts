import { createActionGroup, props } from '@ngrx/store';

export const MenuPageActions = createActionGroup({
  source: 'Menu Page',
  events: {
    'Query Changed': props<{ query: string }>(),
    'Category Selected': props<{ categoryId: string | null }>(),
  },
});
