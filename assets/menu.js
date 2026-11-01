// Menu data is kept in one place so names and prices can be edited easily.
    // Prices are text to preserve peso signs, commas and the supplied asterisks.
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
        { name: "Basil Mash", price: "₱199" }
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
      { id: "beer-buckets", group: "bar", title: "Beer Buckets – 6 Bottles", items: [
        { name: "Red Horse", price: "₱649" },
        { name: "San Miguel Pale Pilsen", price: "₱649" },
        { name: "San Miguel Apple", price: "₱649" }
      ]},
      { id: "shots", group: "bar", title: "Shots", items: [
        { name: "Jose Cuervo Tequila", price: "₱165" },
        { name: "Jack Daniel’s", price: "₱165" },
        { name: "Johnnie Walker Black", price: "₱165" },
        { name: "Chivas Regal 12 Years", price: "₱165" }
      ]},
      { id: "cocktail-towers", group: "bar", title: "Cocktail Towers – 3 Liters", items: [
        { name: "PUBLIQ Sunrise", price: "₱719" },
        { name: "Lime Time", price: "₱719" },
        { name: "Blush Hour", price: "₱719" }
      ]},
      { id: "mocktails", group: "bar", title: "Mocktails", items: [
        { name: "Lemonade", price: "₱175" },
        { name: "Cranberry Soda", price: "₱175" },
        { name: "Virgin Mojito", price: "₱175" },
        { name: "Cucumber Basil Lemonade", price: "₱175" },
        { name: "Virgin Long Island Tea", price: "₱175" }
      ]},
      { id: "beverages-mixers", group: "bar", title: "Beverages & Mixers", items: [
        { name: "Coke (Can)", price: "₱119" },
        { name: "Sprite (Can)", price: "₱119" },
        { name: "Four Seasons (Can)", price: "₱119*" },
        { name: "Pineapple Juice (Can)", price: "₱119*" },
        { name: "Orange Juice (Can)", price: "₱119*" },
        { name: "Tonic Water (Can)", price: "₱139" },
        { name: "Bottled Water (500ml)", price: "₱55" },
        { name: "Coke (1.5L)", price: "₱219" },
        { name: "Sprite (1.5L)", price: "₱219" }
      ]},
      { id: "food-menu", group: "food", title: "Food Menu", items: [
        { name: "Nachos", price: "₱205" },
        { name: "Truffle Fries", price: "₱295" },
        { name: "Wedge Cut Fries", price: "₱295" },
        { name: "Dynamite", price: "₱205" },
        { name: "Breaded Cheese Stick", price: "₱205" },
        { name: "Mozzarella Stick", price: "₱359" },
        { name: "Onion Rings", price: "₱225" },
        { name: "Gyoza", price: "₱295" },
        { name: "Half Fried Chicken", price: "₱450" },
        { name: "Buffalo Wings", price: "₱395" },
        { name: "Buttered Chicken", price: "₱450" },
        { name: "Chicken Skin", price: "₱205" },
        { name: "Chicken Isaw", price: "₱205" },
        { name: "Dinakdakan", price: "₱370" },
        { name: "Sisig", price: "₱280" },
        { name: "Crispy Pata", price: "₱1,010" },
        { name: "Chicharon Bulaklak", price: "₱225" },
        { name: "Calamares", price: "₱295" },
        { name: "Tempura", price: "₱295" },
        { name: "Gambas", price: "₱340" },
        { name: "Spaghetti Bolognese", price: "₱505" },
        { name: "Carbonara", price: "₱360" },
        { name: "Aglio Olio", price: "₱260" },
        { name: "Bulalo Steak", price: "₱1,110" },
        { name: "Pancit Mix", price: "₱450" }
      ]},
      { id: "frappes", group: "food", title: "Frappes – 16 oz", items: [
        { name: "Java Chip", price: "₱235" },
        { name: "Chocolate Chip Cream", price: "₱195" },
        { name: "White Chocolate Frappe", price: "₱205" },
        { name: "Caramel Frappuccino", price: "₱185" },
        { name: "White Chocolate Cream", price: "₱160" },
        { name: "Caramel Cream Frappe", price: "₱165" },
        { name: "White Chocolate Chip Cream Frappuccino", price: "₱190" }
      ]},
      { id: "iced-caffeinated", group: "food", title: "Iced Caffeinated Drinks – 16 oz", items: [
        { name: "Café Mocha", price: "₱195" },
        { name: "Spanish Latte", price: "₱150" },
        { name: "Vanilla Sweet Cream Americano", price: "₱115" },
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
      { id: "iced-noncoffee", group: "food", title: "Iced Non-Coffee Drinks – 16 oz", items: [
        { name: "Matcha Cream Latte", price: "₱180" },
        { name: "Signature Chocolate", price: "₱135" },
        { name: "White Chocolate Cream Mocha", price: "₱135" },
        { name: "Salted Caramel Cream Oat Milk", price: "₱110" }
      ]},
      { id: "hot-noncoffee", group: "food", title: "Hot Non-Coffee Drinks – 12 oz", items: [
        { name: "Matcha Cream Latte", price: "₱180" },
        { name: "Signature Chocolate", price: "₱135" },
        { name: "White Chocolate Cream Mocha", price: "₱135" },
        { name: "Salted Caramel Cream Oat Milk", price: "₱110" }
      ]}
    ];

    const menuGroups = [
      { key: "bar", id: "bar-menu", title: "Bar Menu", kicker: "Bottles · Cocktails · More" },
      { key: "food", id: "food-cafe-menu", title: "Food & Café Menu", kicker: "Food · Frappes · Coffee" }
    ];
    const totalItems = menuSections.reduce((sum, section) => sum + section.items.length, 0);
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
        const name = document.createElement("span");
        name.className = "item-name";
        name.textContent = item.name;
        const price = document.createElement("span");
        price.className = "item-price";
        price.textContent = item.price;
        row.append(name, price);
        list.append(row);
      }
      return list;
    }

    function createMenuCard(section, items) {
      const card = document.createElement("section");
      card.className = "menu-section";
      if (section.id === "bottled-spirits") card.classList.add("long-spirits");
      if (section.id === "food-menu") card.classList.add("food-menu-card");
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

      if (section.id === "bottled-spirits" || section.id === "food-menu") {
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

    function renderMenu(searchTerm = "") {
      const query = searchTerm.trim().toLocaleLowerCase();
      categoryNav.replaceChildren();
      menuRoot.replaceChildren();
      let visibleItems = 0;
      let visibleCategories = 0;
      let visibleGroups = 0;

      for (const group of menuGroups) {
        const groupSections = menuSections.filter((section) => section.group === group.key);
        const matchedSections = groupSections.map((section) => ({
          section,
          items: section.items.filter((item) => `${item.name} ${item.price} ${section.title} ${group.title}`.toLocaleLowerCase().includes(query))
        })).filter(({ items }) => !query || items.length > 0);
        if (matchedSections.length === 0) continue;
        visibleGroups += 1;
        visibleCategories += matchedSections.length;
        visibleItems += matchedSections.reduce((sum, row) => sum + row.items.length, 0);

        const groupLink = document.createElement("a");
        groupLink.className = "group-chip";
        groupLink.href = `#${group.id}`;
        groupLink.textContent = group.title;
        categoryNav.append(groupLink);
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
        groupCount.textContent = `${countItems} items · ${matchedSections.length} sections`;
        heading.append(titleWrap, groupCount);
        const grid = document.createElement("div");
        grid.className = "menu-grid";
        for (const { section, items } of matchedSections) grid.append(createMenuCard(section, items));
        groupElement.append(heading, grid);
        menuRoot.append(groupElement);
      }

      if (visibleItems === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No menu items match that search. Try another name or section.";
        menuRoot.append(empty);
        resultCount.textContent = "No results";
      } else if (query) {
        resultCount.textContent = `${visibleItems} ${visibleItems === 1 ? "item" : "items"} in ${visibleCategories} ${visibleCategories === 1 ? "section" : "sections"}`;
      } else {
        resultCount.textContent = `${totalItems} items · ${menuSections.length} sections`;
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
    renderMenu();
