import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Category, CategoryInput, MenuItem, MenuItemInput, MenuSnapshot } from '@pecan/shared';
import { ApiException } from '../common/api-exception.js';
import { RealtimeEvents } from '../realtime/realtime-events.js';
import { seedMenu } from './seed.js';

@Injectable()
export class MenuService {
  private readonly categories = new Map<string, Category>();
  private readonly items = new Map<string, MenuItem>();

  constructor(private readonly events: RealtimeEvents) {
    const seed = seedMenu();
    seed.categories.forEach((category) => this.categories.set(category.id, category));
    seed.items.forEach((item) => this.items.set(item.id, item));
  }

  snapshot(): MenuSnapshot {
    return { categories: [...this.categories.values()], items: [...this.items.values()] };
  }

  findItem(id: string): MenuItem | undefined {
    return this.items.get(id);
  }

  createCategory(input: CategoryInput): Category {
    const category: Category = { ...input, id: randomUUID() };
    return this.saveCategory(category);
  }

  updateCategory(id: string, patch: Partial<CategoryInput>): Category {
    return this.saveCategory({ ...this.requireCategory(id), ...definedOnly(patch), id });
  }

  deleteCategory(id: string): void {
    this.requireCategory(id);
    for (const item of this.items.values()) {
      if (item.categoryId === id) {
        throw new ApiException('VALIDATION', 'Move or delete the items in this category first');
      }
    }
    this.categories.delete(id);
    this.events.publish({ type: 'category.deleted', id });
  }

  createItem(input: MenuItemInput): MenuItem {
    return this.saveItem({ ...input, id: randomUUID() });
  }

  updateItem(id: string, patch: Partial<MenuItemInput>): MenuItem {
    return this.saveItem({ ...this.requireItem(id), ...definedOnly(patch), id });
  }

  deleteItem(id: string): void {
    this.requireItem(id);
    this.items.delete(id);
    this.events.publish({ type: 'item.deleted', id });
  }

  private saveCategory(category: Category): Category {
    this.categories.set(category.id, category);
    this.events.publish({ type: 'category.upserted', category });
    return category;
  }

  private saveItem(candidate: MenuItem): MenuItem {
    if (!this.categories.has(candidate.categoryId)) {
      throw new ApiException('VALIDATION', `Category "${candidate.categoryId}" does not exist`);
    }
    if (!candidate.openPrice && candidate.price === null) {
      throw new ApiException('VALIDATION', 'A fixed-price item needs a price');
    }
    const item: MenuItem = candidate.openPrice ? { ...candidate, price: null } : candidate;
    this.items.set(item.id, item);
    this.events.publish({ type: 'item.upserted', item });
    return item;
  }

  private requireCategory(id: string): Category {
    const category = this.categories.get(id);
    if (!category) throw ApiException.notFound('Category', id);
    return category;
  }

  private requireItem(id: string): MenuItem {
    const item = this.items.get(id);
    if (!item) throw ApiException.notFound('Item', id);
    return item;
  }
}

/** DTO instances carry every declared field, so a field the client didn't send is `undefined`. */
function definedOnly<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
