# Publish the PUBLIQ Super Club menu on GitHub Pages

<<<<<<< HEAD
This folder is a **static website**: `index.html` and local image files. It needs no admin login, database, API, server, Vercel Function, environment variables, or build command.

The page combines the latest bar menu with the earlier Food & Café list. It has **15 sections and 118 items**. Menu names and prices come from your supplied lists—not from text in the reference posters. The “Witching Hour Food Bundles” shown in the reference were omitted because their exact bundle contents and prices were not supplied. The page includes the notice you selected: all prices include 12% VAT, and no additional service charge applies to food or bar orders. The three juice-price asterisks are preserved; no footnote was provided.

## 1. Download and unzip the site

Download `publiq-super-club-static-menu.zip` and extract it. At the top level you should see:
=======
This folder is a **static website**: it is just `index.html` plus local image files. It needs no admin login, database, API, server, Vercel Function, environment variables, or build command.

> The menu contains only the nine sections in your latest menu list. The earlier food and café menu is not included. The three supplied `*` marks are kept on the canned juice prices; no footnote was supplied. No VAT or service-charge notice is shown.

## 1. Download and unzip the site

Download `publiq-super-club-static-menu.zip` and extract it on your computer. At the top level you should see:
>>>>>>> c6e5a78fcc1d80d40efbc03ef1ddafccbf16905e

```text
index.html
assets/
.nojekyll
README.md
GITHUB-PAGES-TUTORIAL.md
```

<<<<<<< HEAD
**Important:** `index.html` must be at the root of the GitHub repository, beside `assets/`. Do not upload a containing folder that leaves `index.html` one directory deeper.
=======
**Important:** `index.html` must be at the root of the GitHub repository, alongside `assets/`. Do not upload a containing folder that leaves `index.html` one directory deeper.
>>>>>>> c6e5a78fcc1d80d40efbc03ef1ddafccbf16905e

## 2. Create a clean GitHub repository

1. Sign in at [github.com](https://github.com/).
2. Select **+** → **New repository**.
3. Enter a name such as `publiq-super-club-menu`.
4. Choose **Public** if using GitHub Free. GitHub Pages is available for public repositories on GitHub Free; plan availability for private repositories varies. See [GitHub Pages Quickstart](https://docs.github.com/en/pages/quickstart).
<<<<<<< HEAD
5. You can leave **Add a README file** unchecked because the site already includes one.
6. Select **Create repository**.

Use a new, clean repository for this static version. Do not upload the old server/admin project if you only want the static menu.

## 3. Upload the page and pictures

1. In the new repository, select **Add file** → **Upload files**.
2. Upload `index.html`, `.nojekyll`, `README.md`, `GITHUB-PAGES-TUTORIAL.md`, and the complete `assets` folder with all eight files inside it.
3. Confirm the final file list shows `index.html` at the top level and `assets/` beside it.
4. Enter a commit message such as `Add PUBLIQ static menu`, then select **Commit changes**.

If your browser's upload screen does not accept the `assets` folder, upload the files inside it while keeping their paths under `assets/`. You can also use GitHub Desktop: clone the repository, copy these files into the cloned repository folder, then commit and push.
=======
5. You can leave **Add a README file** unchecked because this site already has one.
6. Select **Create repository**.

Use a new, clean repository for this static version. Do not upload the old server/admin project if you only want a static customer menu.

## 3. Upload the page and its pictures

1. In the new repository, select **Add file** → **Upload files**.
2. From the extracted site folder, upload `index.html`, `.nojekyll`, `README.md`, `GITHUB-PAGES-TUTORIAL.md`, and the complete `assets` folder with all five files inside it.
3. Make sure the final repository file list shows `index.html` at the top level and `assets/` beside it.
4. Enter a commit message such as `Add PUBLIQ static menu`, then select **Commit changes**.

If your browser's upload screen does not accept the whole `assets` folder, upload the five files inside `assets` while keeping their folder path as `assets/...`. You can also use GitHub Desktop: clone the repository, copy these files into the cloned repository folder, then commit and push.
>>>>>>> c6e5a78fcc1d80d40efbc03ef1ddafccbf16905e

## 4. Turn on GitHub Pages

1. In your repository, open **Settings**.
2. In the sidebar, open **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set the branch to **main** and the folder to **/(root)**.
5. Select **Save**.

<<<<<<< HEAD
GitHub Pages can publish from the repository root or a `/docs` folder. These steps follow [GitHub's branch-publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
=======
These are GitHub's current branch-publishing steps; Pages can publish from the repository root or a `/docs` folder. See [Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
>>>>>>> c6e5a78fcc1d80d40efbc03ef1ddafccbf16905e

## 5. Open the published site

Wait for the Pages deployment to finish. GitHub will show the site URL in **Settings → Pages**. For a normal repository, it usually looks like:

```text
https://YOUR-GITHUB-USERNAME.github.io/publiq-super-club-menu/
```

<<<<<<< HEAD
Replace `YOUR-GITHUB-USERNAME` with your GitHub username and adjust the repository name if you chose a different one. Publishing can take a few minutes; GitHub says it may take up to 10 minutes.

## 6. Change menu items or prices

1. In the repository, open `index.html` and select the pencil/edit control.
2. Search within the file for `const menuSections = [`.
3. Each category is an object. For example:
=======
Replace `YOUR-GITHUB-USERNAME` with your GitHub username and adjust the repository name if you chose a different one. Publishing can take a few minutes; the GitHub Pages quickstart says it may take up to 10 minutes.

## 6. Change menu items or prices later

1. In the repository, open `index.html` and select the pencil/edit control.
2. Search within the file for `const menuSections = [`.
3. Each category contains item entries such as:
>>>>>>> c6e5a78fcc1d80d40efbc03ef1ddafccbf16905e

   ```js
   { name: "Jim Beam", price: "₱3,299" },
   ```

<<<<<<< HEAD
4. Edit the name or price, keeping the quotes, commas, and brackets.
5. Select **Commit changes**. GitHub Pages republishes after the commit.

Prices are stored as text so peso signs, commas, and the supplied asterisks display exactly. If you add a new category, copy one existing section object and give it a new `id`, a `group` of `bar` or `food`, a `title`, and an `items` list.

## 7. Replace the illustrative photos

The current pictures are illustrative and do not show the exact listed brands or dishes. To use real PUBLIQ photography, replace the relevant files under `assets/` and keep the filenames, or update the matching `src="assets/..."` in `index.html`:

```text
witching-hour-hero.jpg
cocktail-hero.jpg
spirits-stilllife.jpg
beer-bucket.jpg
witching-hour-food.jpg
witching-hour-cafe.jpg
publiq-superclub-logo.jpg
publiq-super-club-icon.svg
```

Upload the replacements and commit. Filenames are case-sensitive on GitHub Pages.

## Troubleshooting

- **404 / page not found:** confirm Pages is set to branch `main` and `/(root)`, and confirm `index.html` is directly in the repository root.
- **Page opens but pictures are missing:** confirm `assets/` sits beside `index.html` and filenames match the paths above.
- **Old version still appears:** wait a few minutes, then refresh. Your browser may have cached the older page.
- **No environment variables:** correct—this site does not use any. Do not add database passwords, admin passwords, or other secrets to a public repository.
=======
4. Edit the name or price, taking care to keep the quotes, commas, and brackets.
5. Select **Commit changes**. GitHub Pages publishes the updated file after the commit.

The price is stored as text so peso signs, commas, and the supplied asterisks display exactly. Keep the asterisk on the three canned juice prices unless you have the note it refers to.

## 7. Replace the illustrative photos

The current photos are illustrative and do not show the exact listed products. To use PUBLIQ's real photos, replace these files in `assets/` with your own images using the same filenames:

- `cocktail-hero.jpg`
- `spirits-stilllife.jpg`
- `beer-bucket.jpg`
- `publiq-superclub-logo.jpg` (only replace this if you have an updated logo)
- `publiq-super-club-icon.svg` (optional app/browser icon)

Upload the replacements and commit. If you use different filenames, edit the corresponding `src="assets/..."` in `index.html` to match. File-name capitalization must match exactly.

## Troubleshooting

- **404 / page not found:** confirm GitHub Pages is set to `main` and `/(root)`, and confirm `index.html` is directly in the repository root.
- **Page appears but pictures are missing:** confirm the `assets` folder sits beside `index.html` and its filenames match the paths above.
- **Old version still appears:** wait a few minutes, then refresh the page. Your browser may have cached the old version.
- **No environment variables:** correct—this static page does not use any. Do not add database passwords, admin passwords, or other secrets to a public repository.
>>>>>>> c6e5a78fcc1d80d40efbc03ef1ddafccbf16905e
