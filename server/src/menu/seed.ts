import type { Category, MenuItem, MenuSnapshot } from '@pecan/shared';

const CATEGORIES: readonly (readonly [name: string, noun: string])[] = [
  ['Breakfast', 'Plate'],
  ['Starters', 'Bite'],
  ['Soups', 'Soup'],
  ['Salads', 'Salad'],
  ['Burgers', 'Burger'],
  ['Sandwiches', 'Sandwich'],
  ['Pizza', 'Pizza'],
  ['Pasta', 'Pasta'],
  ['Grill', 'Steak'],
  ['Seafood', 'Fish'],
  ['Chicken', 'Chicken'],
  ['Vegetarian', 'Bowl'],
  ['Vegan', 'Wrap'],
  ['Sushi', 'Roll'],
  ['Noodles', 'Noodles'],
  ['Curry', 'Curry'],
  ['Tacos', 'Taco'],
  ['Sides', 'Side'],
  ['Kids', 'Kids Meal'],
  ['Desserts', 'Cake'],
  ['Bakery', 'Pastry'],
  ['Coffee', 'Latte'],
  ['Tea', 'Tea'],
  ['Smoothies', 'Smoothie'],
  ['Soft Drinks', 'Soda'],
];

const FLAVOURS = [
  'Smoky',
  'Spicy',
  'Garlic',
  'Herb',
  'Lemon',
  'Truffle',
  'Honey',
  'Chili',
  'Ginger',
  'Pesto',
  'Teriyaki',
  'BBQ',
  'Sesame',
  'Paprika',
  'Basil',
  'Mango',
  'Maple',
  'Pepper',
  'Cajun',
  'Miso',
];

const STYLES = [
  'Classic',
  'House',
  'Signature',
  'Rustic',
  'Deluxe',
  'Mini',
  'Double',
  'Crispy',
  'Grilled',
  'Fresh',
];

const OPEN_PRICE_RATE = 0.03;
const UNAVAILABLE_RATE = 0.05;

/** mulberry32: a tiny seeded PRNG, so every server start produces the same catalogue. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

export function seedMenu(seed = 42): MenuSnapshot {
  const random = createRandom(seed);
  const categories: Category[] = [];
  const items: MenuItem[] = [];

  CATEGORIES.forEach(([name, noun], index) => {
    const category: Category = { id: `cat-${pad(index + 1, 2)}`, name, sortOrder: index };
    categories.push(category);

    for (const flavour of FLAVOURS) {
      for (const style of STYLES) {
        const openPrice = random() < OPEN_PRICE_RATE;
        const dollars = 3 + Math.floor(random() * 27);
        items.push({
          id: `item-${pad(items.length + 1, 4)}`,
          categoryId: category.id,
          name: `${flavour} ${style} ${noun}`,
          description: `${style} ${noun.toLowerCase()} with a ${flavour.toLowerCase()} twist`,
          price: openPrice ? null : dollars * 100 + (random() < 0.5 ? 49 : 99),
          openPrice,
          available: random() >= UNAVAILABLE_RATE,
        });
      }
    }
  });

  return { categories, items };
}
