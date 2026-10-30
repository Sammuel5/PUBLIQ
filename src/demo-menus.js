const categories = [
  ['publiq-food', 'Food Menu', ''],
  ['publiq-frappes', 'Frappes, 16 oz', ''],
  ['publiq-iced-coffee', 'Iced Caffeinated Drinks, 16 oz', ''],
  ['publiq-hot-coffee', 'Hot Caffeinated Drinks, 12 oz', ''],
  ['publiq-iced-noncoffee', 'Iced Non-Coffee Drinks, 16 oz', ''],
  ['publiq-hot-noncoffee', 'Hot Non-Coffee Drinks, 12 oz', ''],
];

const items = [
  ['publiq-nachos', 'publiq-food', 'Nachos', 205],
  ['publiq-truffle-fries', 'publiq-food', 'Truffle Fries', 295],
  ['publiq-wedge-cut-fries', 'publiq-food', 'Wedge Cut Fries', 295],
  ['publiq-dynamite', 'publiq-food', 'Dynamite', 205],
  ['publiq-breaded-cheese-stick', 'publiq-food', 'Breaded Cheese Stick', 205],
  ['publiq-mozzarella-stick', 'publiq-food', 'Mozzarella Stick', 359],
  ['publiq-onion-rings', 'publiq-food', 'Onion Rings', 225],
  ['publiq-gyoza', 'publiq-food', 'Gyoza', 295],
  ['publiq-half-fried-chicken', 'publiq-food', 'Half Fried Chicken', 450],
  ['publiq-buffalo-wings', 'publiq-food', 'Buffalo Wings', 395],
  ['publiq-buttered-chicken', 'publiq-food', 'Buttered Chicken', 450],
  ['publiq-chicken-skin', 'publiq-food', 'Chicken Skin', 205],
  ['publiq-chicken-isaw', 'publiq-food', 'Chicken Isaw', 205],
  ['publiq-dinakdakan', 'publiq-food', 'Dinakdakan', 370],
  ['publiq-sisig', 'publiq-food', 'Sisig', 280],
  ['publiq-crispy-pata', 'publiq-food', 'Crispy Pata', 1010],
  ['publiq-chicharon-bulaklak', 'publiq-food', 'Chicharon Bulaklak', 225],
  ['publiq-calamares', 'publiq-food', 'Calamares', 295],
  ['publiq-tempura', 'publiq-food', 'Tempura', 295],
  ['publiq-gambas', 'publiq-food', 'Gambas', 340],
  ['publiq-spaghetti-bolognese', 'publiq-food', 'Spaghetti Bolognese', 505],
  ['publiq-carbonara', 'publiq-food', 'Carbonara', 360],
  ['publiq-aglio-olio', 'publiq-food', 'Aglio Olio', 260],
  ['publiq-bulalo-steak', 'publiq-food', 'Bulalo Steak', 1110],
  ['publiq-pancit-mix', 'publiq-food', 'Pancit Mix', 450],

  ['publiq-java-chip', 'publiq-frappes', 'Java Chip', 235],
  ['publiq-chocolate-chip-cream', 'publiq-frappes', 'Chocolate Chip Cream', 195],
  ['publiq-white-chocolate-frappe', 'publiq-frappes', 'White Chocolate Frappe', 205],
  ['publiq-caramel-frappuccino', 'publiq-frappes', 'Caramel Frappuccino', 185],
  ['publiq-white-chocolate-cream', 'publiq-frappes', 'White Chocolate Cream', 160],
  ['publiq-caramel-cream-frappe', 'publiq-frappes', 'Caramel Cream Frappe', 165],
  ['publiq-white-chocolate-chip-cream-frappuccino', 'publiq-frappes', 'White Chocolate Chip Cream Frappuccino', 190],

  ['publiq-iced-cafe-mocha', 'publiq-iced-coffee', 'Café Mocha', 195],
  ['publiq-spanish-latte-iced', 'publiq-iced-coffee', 'Spanish Latte', 150],
  ['publiq-vanilla-sweet-cream-americano-iced', 'publiq-iced-coffee', 'Vanilla Sweet Cream Americano', 115],
  ['publiq-vanilla-latte-iced', 'publiq-iced-coffee', 'Vanilla Latte', 150],
  ['publiq-brown-sugar-oat-espresso', 'publiq-iced-coffee', 'Brown Sugar Ice Shaken Oat Milk Espresso', 180],
  ['publiq-salted-caramel-latte-iced', 'publiq-iced-coffee', 'Salted Caramel Latte', 175],
  ['publiq-caramel-macchiato-iced', 'publiq-iced-coffee', 'Caramel Macchiato', 175],
  ['publiq-white-chocolate-mocha-iced', 'publiq-iced-coffee', 'White Chocolate Mocha', 205],
  ['publiq-barista-drink', 'publiq-iced-coffee', 'Barista Drink', 195],
  ['publiq-hazelnut-macchiato-iced', 'publiq-iced-coffee', 'Hazelnut Macchiato', 150],

  ['publiq-vanilla-latte-hot', 'publiq-hot-coffee', 'Vanilla Latte', 150],
  ['publiq-salted-caramel-latte-hot', 'publiq-hot-coffee', 'Salted Caramel Latte', 175],
  ['publiq-caramel-macchiato-hot', 'publiq-hot-coffee', 'Caramel Macchiato', 175],
  ['publiq-white-chocolate-mocha-hot', 'publiq-hot-coffee', 'White Chocolate Mocha', 205],
  ['publiq-hazelnut-macchiato-hot', 'publiq-hot-coffee', 'Hazelnut Macchiato', 150],
  ['publiq-vanilla-sweet-cream-americano-hot', 'publiq-hot-coffee', 'Vanilla Sweet Cream Americano', 115],

  ['publiq-matcha-iced', 'publiq-iced-noncoffee', 'Matcha Cream Latte', 180],
  ['publiq-signature-chocolate-iced', 'publiq-iced-noncoffee', 'Signature Chocolate', 135],
  ['publiq-white-chocolate-cream-mocha-iced', 'publiq-iced-noncoffee', 'White Chocolate Cream Mocha', 135],
  ['publiq-salted-caramel-cream-oat-milk-iced', 'publiq-iced-noncoffee', 'Salted Caramel Cream Oat Milk', 110],

  ['publiq-matcha-hot', 'publiq-hot-noncoffee', 'Matcha Cream Latte', 180],
  ['publiq-signature-chocolate-hot', 'publiq-hot-noncoffee', 'Signature Chocolate', 135],
  ['publiq-white-chocolate-cream-mocha-hot', 'publiq-hot-noncoffee', 'White Chocolate Cream Mocha', 135],
  ['publiq-salted-caramel-cream-oat-milk-hot', 'publiq-hot-noncoffee', 'Salted Caramel Cream Oat Milk', 110],
];

function makePubliqMenu() {
  return {
    _id: 'publiq-superclub',
    restaurantId: 'publiq-superclub',
    slug: 'publiq-superclub',
    restaurant: {
      name: 'PUBLIQ Super Club',
      description: '',
      menuHeaderNote: 'PUBLIQ Super Club · FOOD & CAFÉ',
      menuAnnouncement: 'All SRPs include 12% VAT. No additional service charge applies to food or café orders.',
      logoUrl: '/assets/publiq-superclub-logo.jpg',
      coverImageUrl: '',
      contact: {},
    },
    version: 1,
    publishedAt: null,
    categories: categories.map(([id, name, description], sortOrder) => ({ id, name, description, sortOrder, isActive: true })),
    items: items.map(([id, categoryId, name, price], sortOrder) => ({
      id, categoryId, name, description: '', price, currency: 'PHP', imageUrl: '', dietaryLabels: [], sortOrder, isAvailable: true, createdAt: null, updatedAt: null,
    })),
  };
}

// Internal pricing notes supplied by the restaurant. These values are deliberately never
// included in the public menu snapshot or customer API response.
export const PUBLIQ_INTERNAL_FOOD_COST_NOTES = Object.freeze({
  'Mozzarella Stick': 36,
  Gyoza: 35,
  'Spaghetti Bolognese': 32,
});

// One public, read-only PUBLIQ menu. It does not require a user, admin account, or database record.
const publiqMenu = makePubliqMenu();
export const PUBLIC_DEMO_MENUS = [publiqMenu];
const demoMenuBySlug = new Map(PUBLIC_DEMO_MENUS.map((snapshot) => [snapshot.slug, snapshot]));

export function getPublicDemoMenu(slug) {
  return demoMenuBySlug.get(String(slug ?? '')) ?? null;
}
