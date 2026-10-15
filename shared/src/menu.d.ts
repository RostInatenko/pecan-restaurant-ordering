import type { Cents } from './money.js';

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** `null` exactly when `openPrice` is true: the price is entered when ordering. */
  price: Cents | null;
  openPrice: boolean;
  available: boolean;
}

export interface MenuSnapshot {
  categories: Category[];
  items: MenuItem[];
}

export type CategoryInput = Omit<Category, 'id'>;

export type MenuItemInput = Omit<MenuItem, 'id'>;
