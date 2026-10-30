# PUBLIQ Super Club — QR Menu & Admin

A fresh, server-first scaffold configured with one public PUBLIQ Super Club menu. There are no other sample restaurants. The role-aware admin scaffold supports restaurant-scoped staff access; the supplied workspace contained no existing application, so this is a new implementation rather than a migration from an existing PWA, authentication provider, or MongoDB schema.

For step-by-step local setup, database configuration, Super Admin bootstrap, restaurant onboarding, QR publishing, and production deployment, see [SETUP-AND-DEPLOY.md](SETUP-AND-DEPLOY.md).

## Stack

- Node.js 20+, Express 4, MongoDB Node driver, MongoDB persistence
- Plain browser JavaScript/CSS for the admin and customer-facing menu (no duplicated role-specific app shells)
- Server-stored opaque sessions, password hashing with `scrypt`, restaurant-scoped RBAC
- IndexedDB snapshots for public menus, a small public-only Service Worker cache, and local upload storage
- Built-in `node:test` suite plus opt-in Playwright Chromium browser tests

## Local setup

1. Install dependencies and copy the environment template:

   ```sh
   npm install
   cp .env.example .env
   ```

2. Set `MONGODB_URI`, `MONGODB_DB`, and `PUBLIC_BASE_URL` in `.env`. MongoDB must be reachable and the application database user should have only the required database permissions. Do not commit `.env`.

3. Bootstrap the first Super Admin once. The command prompts for an email and a hidden password in a TTY. The password must be at least 14 characters and include uppercase, lowercase, a number, and a symbol. It will not print or log the password. A non-interactive operator may supply `BOOTSTRAP_SUPER_ADMIN_EMAIL` and `BOOTSTRAP_SUPER_ADMIN_PASSWORD` through a secret manager, not a shell command recorded in history.

   ```sh
   npm run bootstrap:super-admin
   ```

   Bootstrap refuses to run in `DEMO_MODE`, refuses to promote an existing account, and refuses to run after any Super Admin already exists. There is no public Super Admin registration endpoint and no default production password.

4. Start the server:

   ```sh
   npm start
   ```

   Open `http://localhost:3000`. For persistent PUBLIQ menu editing, run `npm run seed:publiq-menu` against the configured MongoDB once, then invite the Restaurant Admin and share the one-time invitation URL privately. Menu Editors can be invited later if a Super Admin first enables Menu Editor management for PUBLIQ.

### In-memory UI development mode

For a data-free local UI/API shell when MongoDB is not available:

```sh
DEMO_MODE=true npm start
```

This uses an empty, non-persistent database: it creates no account and does not bypass authentication. The read-only `PUBLIQ Super Club` public menu is served separately from the database and remains available at `/menu.html?slug=publiq-superclub` even when no admin or restaurant record exists. If a database-backed PUBLIQ record exists, its published snapshot takes precedence and is editable by invited staff. Demo mode is explicitly forbidden when `NODE_ENV=production`.

## Security and authorization model

- `users.globalRole` may be `SUPER_ADMIN`; all other administrators receive a `memberships` record scoped to a restaurant. A membership role is exactly `RESTAURANT_ADMIN` or `MENU_EDITOR`.
- Restaurant Admin privileges are derived server-side from the active membership. Menu Editor permissions are intersected with a fixed allowlist. Unknown roles and permissions fail closed.
- Protected API routes check the current active account, live session, restaurant membership, permission, and resource ownership on the server. The browser only uses role-aware navigation for usability.
- Requests use a `SameSite=Strict`, `HttpOnly` opaque session cookie; the raw session token is never persisted. Mutating API requests with a mismatched `Origin` are rejected. API responses are `no-store` except the public published-menu snapshot endpoint.
- Password hashes use Node's `scrypt`. Invitation tokens are random, single-use, expire, and are stored as SHA-256 hashes. The invitation link is returned once to the authorized inviter and uses a URL fragment so the token is not sent in the initial HTTP request. No password, session secret, or invitation token is written to the application audit log.
- Restaurant suspension blocks public reads and publication, revokes pending invitations, and retains menu data. A customer device that has already saved an offline snapshot may continue to display it until it reconnects; the next online request clears that local snapshot if the restaurant is suspended.
- Audit records are server-created, append-only through the app API, and do not expose password/session data. No API route is provided to edit or delete them.

## Offline menu behavior

The customer menu requests only the published snapshot. After a successful online request, it writes that snapshot to IndexedDB and the Service Worker may cache same-origin menu images and the public menu shell. The Service Worker deliberately does not intercept `/api/*`; all administrative APIs remain network-only and private. A private draft preview uses an authenticated `no-store` API and is not written to IndexedDB. Offline publishing/editing is rejected in the UI and the server never publishes client-side drafts.

The shell can serve the last locally saved published snapshot offline. Devices synchronize a newer version only on a later successful online visit; no instant push update or closed-browser synchronization is claimed.

## Tests and commands

```sh
npm test
npx playwright install chromium
# Linux only, when the host is missing Chromium libraries (requires apt/root privileges):
npx playwright install-deps chromium
npm run test:browser
npm start
npm run bootstrap:super-admin
npm run seed:publiq-menu
```

`npm test` runs the in-memory RBAC/API/UI-contract suite and skips the browser tests. `npm run test:browser` launches Chromium and checks the admin shell at 320–1920px, mobile drawer focus and navigation, a phone-sized menu form, Menu Editor action visibility, public-menu offline reload from IndexedDB, and that the Service Worker does not cache API responses. Both suites use the isolated in-memory adapter; they do not require MongoDB. This is not a screen-reader audit, native Android/iOS test, or production MongoDB/deployment verification.

## Implemented in this scaffold

- Shared responsive admin shell with role-scoped navigation, mobile drawer, search/filter/pagination, menu editing, categories, photo upload, invitations, membership management, publishing, QR output, audit viewing, and restaurant/user controls.
- Server-side session, permission, ownership, input validation, session revocation, invitation expiry/reuse prevention, restaurant suspension, and safe published snapshot endpoints.
- MongoDB indexes for account email, restaurant slug, memberships, session/invitation expiration, published menu lookup, and audit lookup.
- Customer menu offline shell and public snapshot storage.
- A fully rebranded PUBLIQ Super Club app, plus a customer menu with the supplied logo and 56 VAT-inclusive food/café items. Six category-specific photo-slot illustrations appear on every dish until real photos are uploaded. `npm run seed:publiq-menu` imports the menu into MongoDB for admin editing without creating any user account. The three provided internal food-cost targets stay admin-only and are excluded from public snapshots.

## Known gaps before production launch

- This is a new scaffold; migration/adaptation to any previous public menu, service worker, authentication provider, QR URL, or MongoDB schema has not been performed.
- Email delivery, verified account recovery/password reset, MFA, and security notifications require an identity/email provider and are not implemented. Invitation links must be delivered manually and securely.
- Uploads currently use the local filesystem. Production multi-instance/container deployments should replace this with private object storage and image processing, while keeping public image URLs immutable and validated.
- MongoDB transactions are not required by the current local adapter. Menu-version compare-and-set prevents duplicate version numbers, but production publication should use a replica-set transaction or equivalent durable snapshot workflow to guarantee atomic metadata+snapshot writes across failures.
- Automated Chromium tests now cover the 320–1920px viewport matrix, mobile drawer focus behavior, a small-screen menu form, role-aware controls, public IndexedDB fallback, and API-cache exclusion against the in-memory adapter. Screen-reader output, Android/iOS browsers, real MongoDB deployment, and production/offline lifecycle under device storage eviction or suspension remain unverified.
- Billing/subscriptions and delegated impersonation are intentionally not implemented.
