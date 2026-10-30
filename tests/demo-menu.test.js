import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicDemoMenu, PUBLIC_DEMO_MENUS, PUBLIQ_INTERNAL_FOOD_COST_NOTES } from '../src/demo-menus.js';

const expectedCategories = [
  'Food Menu',
  'Frappes, 16 oz',
  'Iced Caffeinated Drinks, 16 oz',
  'Hot Caffeinated Drinks, 12 oz',
  'Iced Non-Coffee Drinks, 16 oz',
  'Hot Non-Coffee Drinks, 12 oz',
];

const expectedItems = [
  ['Food Menu', 'Nachos', 205], ['Food Menu', 'Truffle Fries', 295], ['Food Menu', 'Wedge Cut Fries', 295],
  ['Food Menu', 'Dynamite', 205], ['Food Menu', 'Breaded Cheese Stick', 205], ['Food Menu', 'Mozzarella Stick', 359],
  ['Food Menu', 'Onion Rings', 225], ['Food Menu', 'Gyoza', 295], ['Food Menu', 'Half Fried Chicken', 450],
  ['Food Menu', 'Buffalo Wings', 395], ['Food Menu', 'Buttered Chicken', 450], ['Food Menu', 'Chicken Skin', 205],
  ['Food Menu', 'Chicken Isaw', 205], ['Food Menu', 'Dinakdakan', 370], ['Food Menu', 'Sisig', 280],
  ['Food Menu', 'Crispy Pata', 1010], ['Food Menu', 'Chicharon Bulaklak', 225], ['Food Menu', 'Calamares', 295],
  ['Food Menu', 'Tempura', 295], ['Food Menu', 'Gambas', 340], ['Food Menu', 'Spaghetti Bolognese', 505],
  ['Food Menu', 'Carbonara', 360], ['Food Menu', 'Aglio Olio', 260], ['Food Menu', 'Bulalo Steak', 1110],
  ['Food Menu', 'Pancit Mix', 450],

  ['Frappes, 16 oz', 'Java Chip', 235], ['Frappes, 16 oz', 'Chocolate Chip Cream', 195],
  ['Frappes, 16 oz', 'White Chocolate Frappe', 205], ['Frappes, 16 oz', 'Caramel Frappuccino', 185],
  ['Frappes, 16 oz', 'White Chocolate Cream', 160], ['Frappes, 16 oz', 'Caramel Cream Frappe', 165],
  ['Frappes, 16 oz', 'White Chocolate Chip Cream Frappuccino', 190],

  ['Iced Caffeinated Drinks, 16 oz', 'Café Mocha', 195], ['Iced Caffeinated Drinks, 16 oz', 'Spanish Latte', 150],
  ['Iced Caffeinated Drinks, 16 oz', 'Vanilla Sweet Cream Americano', 115], ['Iced Caffeinated Drinks, 16 oz', 'Vanilla Latte', 150],
  ['Iced Caffeinated Drinks, 16 oz', 'Brown Sugar Ice Shaken Oat Milk Espresso', 180],
  ['Iced Caffeinated Drinks, 16 oz', 'Salted Caramel Latte', 175], ['Iced Caffeinated Drinks, 16 oz', 'Caramel Macchiato', 175],
  ['Iced Caffeinated Drinks, 16 oz', 'White Chocolate Mocha', 205], ['Iced Caffeinated Drinks, 16 oz', 'Barista Drink', 195],
  ['Iced Caffeinated Drinks, 16 oz', 'Hazelnut Macchiato', 150],

  ['Hot Caffeinated Drinks, 12 oz', 'Vanilla Latte', 150], ['Hot Caffeinated Drinks, 12 oz', 'Salted Caramel Latte', 175],
  ['Hot Caffeinated Drinks, 12 oz', 'Caramel Macchiato', 175], ['Hot Caffeinated Drinks, 12 oz', 'White Chocolate Mocha', 205],
  ['Hot Caffeinated Drinks, 12 oz', 'Hazelnut Macchiato', 150],
  ['Hot Caffeinated Drinks, 12 oz', 'Vanilla Sweet Cream Americano', 115],

  ['Iced Non-Coffee Drinks, 16 oz', 'Matcha Cream Latte', 180],
  ['Iced Non-Coffee Drinks, 16 oz', 'Signature Chocolate', 135],
  ['Iced Non-Coffee Drinks, 16 oz', 'White Chocolate Cream Mocha', 135],
  ['Iced Non-Coffee Drinks, 16 oz', 'Salted Caramel Cream Oat Milk', 110],

  ['Hot Non-Coffee Drinks, 12 oz', 'Matcha Cream Latte', 180],
  ['Hot Non-Coffee Drinks, 12 oz', 'Signature Chocolate', 135],
  ['Hot Non-Coffee Drinks, 12 oz', 'White Chocolate Cream Mocha', 135],
  ['Hot Non-Coffee Drinks, 12 oz', 'Salted Caramel Cream Oat Milk', 110],
];

test('PUBLIQ public menu contains only the supplied categories, items, prices, and notice', () => {
  assert.deepEqual(PUBLIC_DEMO_MENUS.map((menu) => menu.slug), ['publiq-superclub']);
  const menu = getPublicDemoMenu('publiq-superclub');
  assert.ok(menu);
  assert.equal(menu.restaurant.name, 'PUBLIQ Super Club');
  assert.deepEqual(menu.categories.map((category) => category.name), expectedCategories);
  assert.ok(menu.categories.every((category) => category.description === ''), 'do not invent category descriptions');
  assert.deepEqual(menu.items.map((item) => [menu.categories.find((category) => category.id === item.categoryId)?.name, item.name, item.price]), expectedItems);
  assert.equal(menu.items.length, 56);
  assert.ok(menu.items.every((item) => item.description === ''), 'do not invent dish descriptions');
  assert.ok(menu.items.every((item) => !Object.hasOwn(item, 'foodCostPercent')));
  assert.equal(menu.restaurant.menuAnnouncement, 'All SRPs include 12% VAT. No additional service charge applies to food or café orders.');
  assert.deepEqual(PUBLIQ_INTERNAL_FOOD_COST_NOTES, { 'Mozzarella Stick': 36, Gyoza: 35, 'Spaghetti Bolognese': 32 });
  assert.equal(getPublicDemoMenu('other-restaurant'), null);
});
