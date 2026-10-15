import type { MenuItemInput } from '@pecan/shared';
import { ApiException } from '../common/api-exception.js';
import type { RealtimeEvents } from '../realtime/realtime-events.js';
import { MenuService } from './menu.service.js';

describe('MenuService', () => {
  let publish: ReturnType<typeof vi.fn>;
  let service: MenuService;

  const newItem = (overrides: Partial<MenuItemInput> = {}): MenuItemInput => ({
    categoryId: 'cat-01',
    name: 'Test Pancakes',
    description: '',
    price: 899,
    openPrice: false,
    available: true,
    ...overrides,
  });

  beforeEach(() => {
    publish = vi.fn();
    service = new MenuService({ publish } as unknown as RealtimeEvents);
  });

  it('starts with the seeded catalogue', () => {
    const { categories, items } = service.snapshot();
    expect(categories).toHaveLength(25);
    expect(items).toHaveLength(5000);
  });

  it('publishes an upsert when an item is created', () => {
    const item = service.createItem(newItem());
    expect(publish).toHaveBeenCalledWith({ type: 'item.upserted', item });
  });

  it('keeps fields the patch does not set', () => {
    const item = service.createItem(newItem());
    const updated = service.updateItem(item.id, { name: 'Renamed', price: undefined });
    expect(updated).toMatchObject({ name: 'Renamed', price: 899 });
  });

  it('clears the price of an open-price item', () => {
    const item = service.createItem(newItem({ openPrice: true, price: 500 }));
    expect(item.price).toBeNull();
  });

  it('rejects a fixed-price item without a price', () => {
    expect(() => service.createItem(newItem({ price: null }))).toThrow(ApiException);
  });

  it('rejects an item in an unknown category', () => {
    expect(() => service.createItem(newItem({ categoryId: 'nope' }))).toThrow(ApiException);
  });

  it('refuses to delete a category that still has items', () => {
    expect(() => service.deleteCategory('cat-01')).toThrow(ApiException);
  });

  it('publishes a deletion and forgets the item', () => {
    service.deleteItem('item-0001');
    expect(publish).toHaveBeenCalledWith({ type: 'item.deleted', id: 'item-0001' });
    expect(service.findItem('item-0001')).toBeUndefined();
  });

  it('reports a missing item as NOT_FOUND', () => {
    expect(() => service.updateItem('missing', { name: 'X' })).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });
});
