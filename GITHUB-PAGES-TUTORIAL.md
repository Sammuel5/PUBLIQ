# Publish the PUBLIQ Super Club menu on GitHub Pages

This folder is a **static website**: `index.html`, a separate `assets/styles.css` stylesheet, a separate `assets/menu.js` script, and local image files. It needs no admin login, database, API, server, Vercel Function, environment variables, or build command.

The page combines the bar menu with the Food & Café list: **15 sections and 119 menu items**, plus the featured Red Flag cocktail, six REDnight bundle offers, and the event details supplied in the latest poster. The original typed menu names and prices remain in place; the new cocktail, bundle contents/prices/savings, and event copy come from the poster you approved. The notice says all prices include 12% VAT and no additional service charge applies to food or bar orders. The three juice-price asterisks are preserved; no footnote was supplied.

## 1. Download and unzip the site

Download `publiq-super-club-static-menu.zip` and extract it. At the top level you should see:

```text
index.html
assets/
.nojekyll
README.md
GITHUB-PAGES-TUTORIAL.md
```

**Important:** `index.html` must be at the root of the GitHub repository, beside `assets/`. Do not upload a containing folder that leaves `index.html` one directory deeper.

## 2. Create a clean GitHub repository

1. Sign in at [github.com](https://github.com/).
2. Select **+** → **New repository**.
3. Enter a name such as `publiq-super-club-menu`.
4. Choose **Public** if using GitHub Free. GitHub Pages is available for public repositories on GitHub Free; plan availability for private repositories varies. See [GitHub Pages Quickstart](https://docs.github.com/en/pages/quickstart).
5. You can leave **Add a README file** unchecked because the site already includes one.
6. Select **Create repository**.

Use a new, clean repository for this static version. Do not upload the old server/admin project if you only want the static menu.

## 3. Upload the page and pictures

1. In the new repository, select **Add file** → **Upload files**.
2. Upload `index.html`, `.nojekyll`, `README.md`, `GITHUB-PAGES-TUTORIAL.md`, and the complete `assets` folder with all eight files inside it (four photos, logo, icon, `styles.css`, and `menu.js`).
3. Confirm the final file list shows `index.html` at the top level and `assets/` beside it.
4. Enter a commit message such as `Add PUBLIQ static menu`, then select **Commit changes**.

If your browser's upload screen does not accept the `assets` folder, upload the files inside it while keeping their paths under `assets/`. You can also use GitHub Desktop: clone the repository, copy these files into the cloned repository folder, then commit and push.

## 4. Turn on GitHub Pages

1. In your repository, open **Settings**.
2. In the sidebar, open **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set the branch to **main** and the folder to **/(root)**.
5. Select **Save**.

GitHub Pages can publish from the repository root or a `/docs` folder. These steps follow [GitHub's branch-publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 5. Open the published site

Wait for the Pages deployment to finish. GitHub will show the site URL in **Settings → Pages**. For a normal repository, it usually looks like:

```text
https://YOUR-GITHUB-USERNAME.github.io/publiq-super-club-menu/
```

Replace `YOUR-GITHUB-USERNAME` with your GitHub username and adjust the repository name if you chose a different one. Publishing can take a few minutes; GitHub says it may take up to 10 minutes.

## 6. Change menu items or prices

1. In the repository, open `assets/menu.js` and select the pencil/edit control.
2. Search within the file for `const menuSections = [`.
3. Each category is an object. For example:

   ```js
   { name: "Jim Beam", price: "₱3,299" },
   ```

4. Edit the name or price, keeping the quotes, commas, and brackets.
5. Select **Commit changes**. GitHub Pages republishes after the commit.

Prices are stored as text so peso signs, commas, and the supplied asterisks display exactly. If you add a new category, copy one existing section object and give it a new `id`, a `group` of `bar` or `food`, a `title`, and an `items` list. Red Flag is listed in the Cocktails section. The REDnight bundle cards are stored in `const foodBundles = [` in the same file.

To change the event date, DJ, or doors time, edit the `event-card` block in `index.html`.

## 7. Replace the illustrative photos

The current pictures are illustrative and do not show the exact listed brands or dishes. To use real PUBLIQ photography, replace the relevant files under `assets/` and keep the filenames, or update the matching `src="assets/..."` in `index.html`:

```text
rednight-hero.jpg
rednight-food.jpg
rednight-drink.jpg
rednight-cafe.jpg
publiq-superclub-logo.jpg
publiq-super-club-icon.svg
```

`styles.css` and `menu.js` are also in `assets/`; keep those files when replacing photos.

Upload the replacements and commit. Filenames are case-sensitive on GitHub Pages.

## Troubleshooting

- **404 / page not found:** confirm Pages is set to branch `main` and `/(root)`, and confirm `index.html` is directly in the repository root.
- **Page opens but pictures are missing:** confirm `assets/` sits beside `index.html` and filenames match the paths above.
- **Old version still appears:** wait a few minutes, then refresh. Your browser may have cached the older page.
- **No environment variables:** correct—this site does not use any. Do not add database passwords, admin passwords, or other secrets to a public repository.
