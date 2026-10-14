import type { Cents } from './money.js';

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  rev: number;
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
  rev: number;
}

export interface MenuSnapshot {
  categories: Category[];
  items: MenuItem[];
}

export type CategoryInput = Pick<Category, 'name' | 'sortOrder'>;

export type MenuItemInput = Omit<MenuItem, 'id' | 'rev'>;
