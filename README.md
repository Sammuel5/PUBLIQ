# PUBLIQ Super Club — Static Bar Menu

A single-page, mobile-friendly menu designed for GitHub Pages. This is a separate, static-only version of the PUBLIQ Super Club menu.

## What is included

- `index.html` — the complete page, including its styling, menu data, category navigation, and search.
- `assets/` — the supplied PUBLIQ Super Club logo, app icon, and three locally stored illustrative bar photographs.
- `GITHUB-PAGES-TUTORIAL.md` — beginner-friendly instructions to publish it on GitHub Pages.
- `.nojekyll` — lets GitHub Pages serve the files directly without a Jekyll build.

## No backend required

There is no admin login, server, API, database, build step, environment variable, or Vercel Function. The page and images are static files. The menu is visible to anyone with the published link.

## Menu data

The nine sections and 62 item prices in `index.html` match the updated list supplied for this page. The three supplied asterisks on canned juice prices are retained as-is; no footnote was provided. No VAT or service-charge notice is shown, as requested.

The bar photographs are illustrative and do not depict specific listed brands or products. Replace the image files in `assets/` with your own photography at any time (keep the current filenames, or change the corresponding image paths in `index.html`).

## Test locally

You can open `index.html` directly in a browser. For a local web-server preview from this folder, run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

See [`GITHUB-PAGES-TUTORIAL.md`](GITHUB-PAGES-TUTORIAL.md) for deployment and editing instructions.
