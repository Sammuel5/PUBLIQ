// Menu names, prices and promotions transcribed from the latest PUBLIQ posters.
// Prices remain text so peso signs, commas and offer wording display as supplied.
const menuSections = [
  { id: "bottled-spirits", group: "bar", title: "Bottled Spirits", items: [
    { name: "Jim Beam", price: "₱3,299" },
    { name: "Chivas Regal 12 Years", price: "₱2,859" },
    { name: "Johnnie Walker Black (700ml)", price: "₱2,859" },
    { name: "Johnnie Walker Blue Label (750ml)", price: "₱13,750" },
    { name: "Johnnie Walker Red Label (700ml)", price: "₱1,329" },
    { name: "Johnnie Walker Double Black (700ml)", price: "₱3,099" },
    { name: "Jack Daniel’s (700ml)", price: "₱3,299" },
    { name: "Jose Cuervo (700ml)", price: "₱2,299" },
    { name: "Tequila Rose (700ml)", price: "₱2,649" },
    { name: "Alfonso Light (1L)", price: "₱899" },
    { name: "Fundador Light (1L)", price: "₱1,199" },
    { name: "Absolut Vodka", price: "₱2,199" },
    { name: "Absolut Kurant", price: "₱2,199" },
    { name: "Tanqueray (750ml)", price: "₱2,999" },
    { name: "Bacardi (750ml)", price: "₱1,999" },
    { name: "Captain Morgan (700ml)", price: "₱1,299" }
  ]},
  { id: "cocktails", group: "bar", title: "Cocktails", items: [
    { name: "Margarita", price: "₱209" },
    { name: "Long Island Iced Tea", price: "₱209" },
    { name: "Old Fashioned", price: "₱299" },
    { name: "Whisky Smash", price: "₱249" },
    { name: "Gold Rush", price: "₱359" },
    { name: "Espresso Martini", price: "₱249" },
    { name: "Gin & Tonic", price: "₱209" },
    { name: "Vodka Tonic", price: "₱209" },
    { name: "Cuba Libre", price: "₱249" },
    { name: "Flaming Volcano", price: "₱299" },
    { name: "Blowjob", price: "₱199" },
    { name: "Basil Mash", price: "₱199" },
    { name: "Tropical Kiss", price: "1st drink on us", note: "Ladies Night special · White Rum · Pineapple Juice · Sprite" }
  ]},
  { id: "cocktail-towers", group: "bar", title: "Cocktail Towers – 3 Liters", items: [
    { name: "PUBLIQ Sunrise", price: "₱719" },
    { name: "Lime Time", price: "₱719" },
    { name: "Blush Hour", price: "₱719" }
  ]},
  { id: "wines", group: "bar", title: "Wines – Per Bottle", items: [
    { name: "Red Wine", price: "₱1,329" },
    { name: "White Wine", price: "₱1,329" },
    { name: "Bottega Sparkling", price: "₱3,999" },
    { name: "Yellow Tail Sparkling", price: "₱1,999" }
  ]},
  { id: "beers", group: "bar", title: "Beers", items: [
    { name: "San Miguel Light", price: "₱119" },
    { name: "San Miguel Pale Pilsen", price: "₱119" },
    { name: "San Miguel Apple", price: "₱119" },
    { name: "Red Horse", price: "₱119" },
    { name: "Smirnoff Mule", price: "₱129" },
    { name: "Heineken", price: "₱155" }
  ]},
  { id: "shots", group: "bar", title: "Shots", items: [
    { name: "Jose Cuervo Tequila", price: "₱165" },
    { name: "Jack Daniel’s", price: "₱165" },
    { name: "Johnnie Walker Black", price: "₱165" },
    { name: "Chivas Regal 12 Years", price: "₱165" }
  ]},
  { id: "mocktails", group: "bar", title: "Mocktails", items: [
    { name: "Lemonade", price: "₱175" },
    { name: "Cranberry Soda", price: "₱175" },
    { name: "Virgin Mojito", price: "₱175" },
    { name: "Cucumber Basil Lemonade", price: "₱175" },
    { name: "Virgin Long Island Tea", price: "₱175" }
  ]},
  { id: "beer-buckets", group: "bar", title: "Beer Buckets – 6 Bottles", items: [
    { name: "Red Horse", price: "₱649" },
    { name: "San Miguel Pale Pilsen", price: "₱649" },
    { name: "San Miguel Apple", price: "₱649" }
  ]},
  { id: "beverages-mixers", group: "bar", title: "Beverages & Mixers", items: [
    { name: "Coke (Can)", price: "₱119" },
    { name: "Sprite (Can)", price: "₱119" },
    { name: "Four Seasons (Can)", price: "₱119" },
    { name: "Pineapple Juice (Can)", price: "₱119" },
    { name: "Orange Juice (Can)", price: "₱119" },
    { name: "Tonic Water (Can)", price: "₱139" },
    { name: "Bottled Water (500ml)", price: "₱55" },
    { name: "Coke (1.5L)", price: "₱219" },
    { name: "Sprite (1.5L)", price: "₱219" }
  ]},
  { id: "appetizers", group: "food", title: "Appetizers", items: [
    { name: "Nachos Supreme", price: "₱205" },
    { name: "Mozzarella Stick", price: "₱359" },
    { name: "Dynamite", price: "₱205" },
    { name: "Gyoza", price: "₱295" },
    { name: "Calamares", price: "₱295" },
    { name: "Onion Rings", price: "₱225" },
    { name: "Truffle Fries", price: "₱295" },
    { name: "Wedge Cut Fries", price: "₱295" },
    { name: "Breaded Cheese Stick", price: "₱205" }
  ]},
  { id: "mains", group: "food", title: "Mains", items: [
    { name: "Half Fried Chicken", price: "₱450" },
    { name: "Crispy Pata", price: "₱1,010" },
    { name: "Buttered Chicken", price: "₱450" },
    { name: "Sisig", price: "₱280" },
    { name: "Gambas", price: "₱340" }
  ]},
  { id: "pasta-noodles", group: "food", title: "Pasta & Noodles", items: [
    { name: "Spaghetti Bolognese", price: "₱505" },
    { name: "Carbonara", price: "₱360" },
    { name: "Pancit Mix", price: "₱450" }
  ]},
  { id: "specials", group: "food", title: "Specials", items: [
    { name: "Chicken Skin", price: "₱205" },
    { name: "Chicken Isaw", price: "₱205" },
    { name: "Dinakdakan", price: "₱370" },
    { name: "Chicharon Bulaklak", price: "₱225" },
    { name: "Bulalo Steak", price: "₱1,110" }
  ]},
  { id: "asian-seafood", group: "food", title: "Asian / Seafood", items: [
    { name: "Tempura", price: "₱295" },
    { name: "Agilo Olio", price: "₱260" }
  ]},
  { id: "frappes", group: "food", title: "Frappes – 16 oz", items: [
    { name: "Java Chip", price: "₱135" },
    { name: "Chocolate Chip Cream", price: "₱135" },
    { name: "White Chocolate Frappe", price: "₱205" },
    { name: "Caramel Frappuccino", price: "₱185" },
    { name: "White Chocolate Cream", price: "₱160" },
    { name: "Caramel Cream Frappe", price: "₱165" },
    { name: "White Chocolate Chip Cream Frappuccino", price: "₱190" }
  ]},
  { id: "iced-caffeinated", group: "food", title: "Iced Caffeinated Drinks – 16 oz", items: [
    { name: "Café Mocha", price: "₱195" },
    { name: "Spanish Latte", price: "₱150" },
    { name: "Vanilla Sweet Cream Americano", price: "₱150" },
    { name: "Vanilla Latte", price: "₱150" },
    { name: "Brown Sugar Ice Shaken Oat Milk Espresso", price: "₱180" },
    { name: "Salted Caramel Latte", price: "₱175" },
    { name: "Caramel Macchiato", price: "₱175" },
    { name: "White Chocolate Mocha", price: "₱205" },
    { name: "Barista Drink", price: "₱195" },
    { name: "Hazelnut Macchiato", price: "₱150" }
  ]},
  { id: "hot-caffeinated", group: "food", title: "Hot Caffeinated Drinks – 12 oz", items: [
    { name: "Vanilla Latte", price: "₱150" },
    { name: "Salted Caramel Latte", price: "₱175" },
    { name: "Caramel Macchiato", price: "₱175" },
    { name: "White Chocolate Mocha", price: "₱205" },
    { name: "Hazelnut Macchiato", price: "₱150" },
    { name: "Vanilla Sweet Cream Americano", price: "₱115" }
  ]},
  { id: "hot-noncoffee", group: "food", title: "Hot Non-Coffee Drinks – 12 oz", items: [
    { name: "Matcha Cream Latte", price: "₱180" },
    { name: "Signature Chocolate", price: "₱135" },
    { name: "White Chocolate Cream Mocha", price: "₱135" },
    { name: "Salted Caramel Cream Oat Milk", price: "₱110" }
  ]}
];

const ladiesNightBundles = [
  { title: "Lip Service", items: ["Mozzarella Sticks", "Truffle Fries", "Dynamite Rolls"], was: "₱859", price: "₱699" },
  { title: "Drama Queens", items: ["Nachos Supreme", "Buffalo Wings", "Gyoza"], was: "₱895", price: "₱749" },
  { title: "Girls Gone Wild", items: ["Calamares", "Chicken Skin", "Onion Rings"], was: "₱725", price: "₱599" },
  { title: "Pretty Little Liars", items: ["Half Fried Chicken", "Spaghetti Bolognese", "Wedge Fries"], was: "₱1,250", price: "₱999" },
  { title: "The Gossip Table", items: ["Sisig", "Gambas", "Carbonara", "Nachos"], was: "₱1,185", price: "₱949" },
  { title: "Queen’s Table", items: ["Crispy Pata", "Buttered Chicken", "Pancit Mix", "Tempura", "Truffle Fries"], was: "₱2,500", price: "₱1,999" }
];

const everydayBundles = [
  { category: "Liquor & Food Bundles", title: "The Jackpot", items: ["Jack Daniel’s 700ml", "Coke 1.5L", "Crispy Pata", "Pork Sisig", "Nachos"], price: "₱4,249" },
  { category: "Liquor & Food Bundles", title: "Blackout", items: ["Johnnie Walker Black Label 700ml", "Coke 1.5L", "Half Fried Chicken", "Dinakdakan", "Breaded Cheese Sticks"], price: "₱3,499" },
  { category: "Liquor & Food Bundles", title: "Tequila Takeover", items: ["Jose Cuervo 700ml", "Sliced Lemon", "Tempura", "Calamares", "Gyoza"], price: "₱2,699" },
  { category: "Cocktail Tower Bundles", title: "Double Trouble", items: ["2 Cocktail Towers (3L each)", "Pork Sisig", "Chicken Skin"], price: "₱1,649" },
  { category: "Cocktail Tower Bundles", title: "After Hours", items: ["2 Cocktail Towers (3L each)", "Dinakdakan", "Crispy Chicken Isaw"], price: "₱1,699" },
  { category: "Cocktail Tower Bundles", title: "Tower of Temptation", items: ["2 Cocktail Towers (3L each)", "Truffle Fries", "Buffalo Wings"], price: "₱1,799" },
  { category: "Beer Bucket Bundles", title: "Bucket List", items: ["2 Beer Buckets (6 bottles each)", "Pork Sisig", "Chicken Skin"], price: "₱1,499" },
  { category: "Beer Bucket Bundles", title: "Buzzed & Bites", items: ["2 Beer Buckets (6 bottles each)", "Dinakdakan", "Crispy Chicken Isaw"], price: "₱1,599" },
  { category: "Beer Bucket Bundles", title: "The Last Round", items: ["2 Beer Buckets (6 bottles each)", "Truffle Fries", "Buffalo Wings"], price: "₱1,699" }
];

const menuGroups = [
  { key: "bar", id: "bar-menu", title: "PUBLIQ Bar Menu", kicker: "Cocktails · Bottled Spirits · More" },
  { key: "food", id: "food-cafe-menu", title: "Food & Café Menu", kicker: "Food Menu · Café Menu" }
];
const totalItems = menuSections.reduce((sum, section) => sum + section.items.length, 0);
const totalBundles = everydayBundles.length + ladiesNightBundles.length;
const categoryNav = document.getElementById("categoryNav");
const menuRoot = document.getElementById("menuSections");
const searchInput = document.getElementById("menuSearch");
const clearButton = document.getElementById("clearSearch");
const resultCount = document.getElementById("resultCount");

function createItemList(items, extraClass = "") {
  const list = document.createElement("ul");
  list.className = `item-list ${extraClass}`.trim();
  for (const item of items) {
    const row = document.createElement("li");
    row.className = "menu-item";
    const copy = document.createElement("span");
    copy.className = "item-copy";
    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;
    copy.append(name);
    if (item.note) {
      const note = document.createElement("span");
      note.className = "item-note";
      note.textContent = item.note;
      copy.append(note);
    }
    const price = document.createElement("span");
    price.className = "item-price";
    price.textContent = item.price;
    row.append(copy, price);
    list.append(row);
  }
  return list;
}

function createMenuCard(section, items) {
  const card = document.createElement("section");
  card.className = "menu-section";
  if (["bottled-spirits", "appetizers"].includes(section.id)) card.classList.add("wide-menu");
  card.id = section.id;
  card.setAttribute("aria-labelledby", `${section.id}-title`);
  const header = document.createElement("div");
  header.className = "section-head";
  const title = document.createElement("h4");
  title.id = `${section.id}-title`;
  title.textContent = section.title;
  const count = document.createElement("span");
  count.className = "section-count";
  count.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  header.append(title, count);
  card.append(header);

  if (["bottled-spirits", "appetizers"].includes(section.id)) {
    const columns = document.createElement("div");
    columns.className = "item-columns";
    const midpoint = Math.ceil(items.length / 2);
    columns.append(createItemList(items.slice(0, midpoint)), createItemList(items.slice(midpoint)));
    card.append(columns);
  } else {
    card.append(createItemList(items));
  }
  return card;
}

function createBundleCard(bundle) {
  const card = document.createElement("article");
  card.className = "bundle-card";
  const name = document.createElement("h5");
  name.textContent = bundle.title;
  const includes = document.createElement("p");
  includes.className = "bundle-includes";
  includes.textContent = bundle.items.join(" · ");
  const prices = document.createElement("div");
  prices.className = bundle.was ? "bundle-prices" : "bundle-prices bundle-prices-current";
  if (bundle.was) {
    const was = document.createElement("s");
    was.className = "bundle-was";
    was.textContent = bundle.was;
    prices.append(was);
  }
  const price = document.createElement("strong");
  price.className = "bundle-price";
  price.textContent = bundle.price;
  prices.append(price);
  card.append(name, includes, prices);
  return card;
}

function createBundleGrid(bundles) {
  const grid = document.createElement("div");
  grid.className = "bundle-grid";
  for (const bundle of bundles) grid.append(createBundleCard(bundle));
  return grid;
}

function createBundleSection(bundles, { id, titleText, subtitleText, categorized = false }) {
  const section = document.createElement("section");
  section.id = id;
  section.className = `bundle-section${categorized ? " bundle-section-grouped" : ""}`;
  section.setAttribute("aria-labelledby", `${id}-title`);
  const heading = document.createElement("div");
  heading.className = "bundle-heading";
  const title = document.createElement("h4");
  title.id = `${id}-title`;
  title.textContent = titleText;
  const subtitle = document.createElement("p");
  subtitle.textContent = subtitleText;
  heading.append(title, subtitle);
  section.append(heading);

  if (categorized) {
    const categories = [...new Set(bundles.map((bundle) => bundle.category))];
    for (const category of categories) {
      const categoryBlock = document.createElement("div");
      categoryBlock.className = "bundle-category";
      const categoryTitle = document.createElement("h5");
      categoryTitle.className = "bundle-category-title";
      categoryTitle.textContent = category;
      const categoryBundles = bundles.filter((bundle) => bundle.category === category);
      categoryBlock.append(categoryTitle, createBundleGrid(categoryBundles));
      section.append(categoryBlock);
    }
  } else {
    section.append(createBundleGrid(bundles));
  }
  return section;
}

function renderMenu(searchTerm = "") {
  const query = searchTerm.trim().toLocaleLowerCase();
  categoryNav.replaceChildren();
  menuRoot.replaceChildren();
  let visibleItems = 0;
  let visibleCategories = 0;
  let visibleBundles = 0;

  const matchedEverydayBundles = everydayBundles.filter((bundle) =>
    `${bundle.title} ${bundle.category} ${bundle.items.join(" ")} ${bundle.price} regular bundles available every day`.toLocaleLowerCase().includes(query)
  );
  if (matchedEverydayBundles.length > 0) {
    const everydayLink = document.createElement("a");
    everydayLink.className = "group-chip";
    everydayLink.href = "#everyday-bundles";
    everydayLink.textContent = "Everyday Bundles";
    categoryNav.append(everydayLink);
    menuRoot.append(createBundleSection(matchedEverydayBundles, {
      id: "everyday-bundles",
      titleText: "Everyday Bundles",
      subtitleText: "Regular menu · Available every day",
      categorized: true
    }));
    visibleBundles += matchedEverydayBundles.length;
  }

  for (const group of menuGroups) {
    const groupSections = menuSections.filter((section) => section.group === group.key);
    const matchedSections = groupSections.map((section) => ({
      section,
      items: section.items.filter((item) => `${item.name} ${item.price} ${item.note ?? ""} ${section.title} ${group.title}`.toLocaleLowerCase().includes(query))
    })).filter(({ items }) => !query || items.length > 0);
    const matchedBundles = group.key === "food" ? ladiesNightBundles.filter((bundle) =>
      `${bundle.title} ${bundle.items.join(" ")} ${bundle.price} ${bundle.was} ladies night food bundles special tonight`.toLocaleLowerCase().includes(query)
    ) : [];
    if (matchedSections.length === 0 && matchedBundles.length === 0) continue;
    visibleCategories += matchedSections.length;
    visibleItems += matchedSections.reduce((sum, row) => sum + row.items.length, 0);
    visibleBundles += matchedBundles.length;

    const groupLink = document.createElement("a");
    groupLink.className = "group-chip";
    groupLink.href = `#${group.id}`;
    groupLink.textContent = group.title;
    categoryNav.append(groupLink);
    if (matchedBundles.length > 0) {
      const bundleLink = document.createElement("a");
      bundleLink.href = "#ladies-night-bundles";
      bundleLink.textContent = "Ladies Night Bundles";
      categoryNav.append(bundleLink);
    }
    for (const { section } of matchedSections) {
      const link = document.createElement("a");
      link.href = `#${section.id}`;
      link.textContent = section.title;
      categoryNav.append(link);
    }

    const groupElement = document.createElement("section");
    groupElement.className = "menu-group";
    groupElement.id = group.id;
    groupElement.setAttribute("aria-labelledby", `${group.id}-title`);
    const heading = document.createElement("header");
    heading.className = "group-head";
    const titleWrap = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "group-kicker";
    kicker.textContent = group.kicker;
    const groupTitle = document.createElement("h3");
    groupTitle.id = `${group.id}-title`;
    groupTitle.textContent = group.title;
    titleWrap.append(kicker, groupTitle);
    const groupCount = document.createElement("span");
    groupCount.className = "group-count";
    const countItems = matchedSections.reduce((sum, row) => sum + row.items.length, 0);
    const countParts = [];
    if (countItems > 0) countParts.push(`${countItems} items`);
    if (matchedSections.length > 0) countParts.push(`${matchedSections.length} sections`);
    if (matchedBundles.length > 0) countParts.push(`${matchedBundles.length} bundles`);
    groupCount.textContent = countParts.join(" · ");
    heading.append(titleWrap, groupCount);
    groupElement.append(heading);
    if (matchedBundles.length > 0) {
      groupElement.append(createBundleSection(matchedBundles, {
        id: "ladies-night-bundles",
        titleText: "Ladies Night Food Bundles",
        subtitleText: "Exclusive food bundles for tonight only"
      }));
    }
    const grid = document.createElement("div");
    grid.className = "menu-grid";
    for (const { section, items } of matchedSections) grid.append(createMenuCard(section, items));
    groupElement.append(grid);
    menuRoot.append(groupElement);
  }

  if (visibleItems === 0 && visibleBundles === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No menu items or bundles match that search. Try another name or section.";
    menuRoot.append(empty);
    resultCount.textContent = "No results";
  } else if (query) {
    const countParts = [];
    if (visibleItems > 0) countParts.push(`${visibleItems} ${visibleItems === 1 ? "item" : "items"}`);
    if (visibleBundles > 0) countParts.push(`${visibleBundles} ${visibleBundles === 1 ? "bundle" : "bundles"}`);
    if (visibleCategories > 0) countParts.push(`${visibleCategories} ${visibleCategories === 1 ? "section" : "sections"}`);
    resultCount.textContent = countParts.join(" · ");
  } else {
    resultCount.textContent = `${totalItems} items · ${menuSections.length} sections · ${totalBundles} bundles`;
  }
  clearButton.hidden = !query;
}
searchInput.addEventListener("input", () => renderMenu(searchInput.value));
clearButton.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  renderMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    renderMenu();
  }
});
const toTop = document.getElementById("toTop");
window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 560), { passive: true });

function scrollToHash(hash = window.location.hash) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest?.('a[href^="#"]');
  if (!link) return;
  const hash = link.getAttribute("href");
  const id = decodeURIComponent(hash.slice(1));
  let target = document.getElementById(id);
  if (!target && searchInput.value) {
    searchInput.value = "";
    renderMenu();
    target = document.getElementById(id);
  }
  if (!target) return;
  event.preventDefault();
  const canonicalHash = `#${encodeURIComponent(id)}`;
  if (window.location.hash !== canonicalHash) window.history.pushState({}, "", canonicalHash);
  scrollToHash(canonicalHash);
});

window.addEventListener("hashchange", () => scrollToHash());
window.addEventListener("popstate", () => scrollToHash());
renderMenu();
if (window.location.hash) requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash()));
