# PUBLIQ Super Club — Setup & Deployment Guide

This guide takes you from the project ZIP to a working PUBLIQ Super Club menu, admin workflow, and QR code. It covers local setup and a provider-neutral managed Node.js deployment. Hosting is **not** configured automatically; for editable persistent data you need MongoDB plus a hosting account/domain.

## How customers and admins use it

- **Admins** visit the site root, for example `https://menus.example.com/`, and sign in to manage the PUBLIQ menu.
- **Customers do not sign in.** The table QR opens `https://menus.example.com/menu.html?slug=publiq-superclub`.
- Customers see the last **published** menu. Draft edits stay private until the Restaurant Admin publishes them.
- The PUBLIQ slug stays stable, so future menu updates do not require reprinting the QR code.
- The customer menu can be prepared for offline browsing after that device has loaded it successfully online once.

### Public PUBLIQ menu

The app is branded PUBLIQ Super Club throughout, and includes one no-login customer menu with your supplied logo, six sections, all 56 food and café items, and the VAT/service-charge notice. Each dish has a category-specific illustrated photo slot until an admin uploads a real photo; the supplied names, categories, and prices are unchanged. There are no other public restaurant examples. The read-only fallback is available at `/menu.html?slug=publiq-superclub` even before an admin or restaurant record exists. To make the menu persistent and editable in MongoDB, run the one-time `npm run seed:publiq-menu` command described below; a database-backed PUBLIQ menu then takes precedence over the fallback.

## 1. What you need

- Node.js **20 or newer** (use a maintained LTS release offered by your host).
- A MongoDB database. MongoDB Atlas is a convenient hosted option; a properly secured MongoDB server also works.
- For deployment: a Node.js web-service host, a domain name (recommended), and HTTPS.
- A terminal. On Windows, use PowerShell; on macOS/Linux, use Terminal.

The in-memory demo mode is only for trying the interface. It creates no users or restaurant records and loses database data when the process stops; the read-only PUBLIQ menu still works without an admin account. **Do not use in-memory demo mode for a real restaurant or in production.** Open `/menu.html?slug=publiq-superclub` to view it.

## 2. Unzip and install locally

Extract `publiq-super-club-platform.zip`, open a terminal in the extracted `publiq-super-club-platform` folder, and install from the lockfile:

```sh
npm ci
```

Create a private local environment file from the template:

```sh
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Never commit `.env`, paste database credentials into screenshots, or send credentials in chat. The project `.gitignore` excludes `.env`.

## 3. Connect MongoDB

You can use a local MongoDB service or a hosted MongoDB deployment. For MongoDB Atlas:

1. Create a cluster and a database user dedicated to this application.
2. Give that user only the database permissions it needs (normally read/write access to this app's database).
3. Configure Atlas network access to allow the app host to connect. Prefer a fixed host IP or private networking where available; do not leave unrestricted network access enabled for production.
4. Copy the **Node.js driver** connection string. Replace the username, password, and cluster name. URL-encode any special characters in the database password.
5. Put the connection string in `.env` locally, or in your hosting provider's secret/environment-variable settings for deployment.

Example local `.env` values (replace the URI and domain values; do not keep angle-bracket placeholders):

```dotenv
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://APP_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=qr_restaurant_menu
PUBLIC_BASE_URL=http://localhost:3000
SESSION_TTL_HOURS=12
INVITATION_TTL_HOURS=48
UPLOAD_MAX_MB=5
DEMO_MODE=false
```

If you use local MongoDB instead, the URI can look like `mongodb://127.0.0.1:27017`. Keep `DEMO_MODE=false` when you want real, persistent data. The app creates its required database indexes when it connects.

## 4. Create the first Super Admin

The platform intentionally has no public Super Admin sign-up and no default password. From the project folder, run:

```sh
npm run bootstrap:super-admin
```

In an interactive terminal, enter the Super Admin email and a strong password when prompted. Password input is hidden. Use a unique password of at least 14 characters with uppercase, lowercase, a number, and a symbol; store it in a password manager.

Bootstrap connects to the MongoDB configured in `.env`. It can only create the first Super Admin once, will not promote an existing user, and refuses to run in demo mode. Keep the app pointed at the same database when you start it.

If you run bootstrap from a non-interactive cloud console, supply `BOOTSTRAP_SUPER_ADMIN_EMAIL` and `BOOTSTRAP_SUPER_ADMIN_PASSWORD` through the provider's temporary secret mechanism—not as a password written into a shell command or deployment log. Remove those temporary variables after bootstrap succeeds.

## 5. Start and test locally

```sh
npm test
npm start
```

Open `http://localhost:3000/` for the admin sign-in. The application does not create a login for you automatically; bootstrap the Super Admin first.

Optional Chromium browser tests:

```sh
npx playwright install chromium
npm run test:browser
```

On Linux, if Chromium reports missing system libraries, install them with `npx playwright install-deps chromium` (requires administrator privileges). Browser tests use a temporary in-memory fixture and do not touch your production database.

## 6. Set up PUBLIQ for admin editing

The no-login fallback menu is view-only and useful before setup. To store the menu in MongoDB so an admin can edit it:

1. Configure `.env` for the intended database, then bootstrap the first Super Admin as described above.
2. Run the import once against that same database:

   ```sh
   npm run seed:publiq-menu
   ```

   This creates the single PUBLIQ restaurant, six categories, 56 menu items, and its first published snapshot. It creates **no user or admin account** and refuses to overwrite an existing restaurant with the PUBLIQ slug. The three supplied internal food-cost targets are stored for authorized admin views and are omitted from public snapshots.

3. Start the app and sign in as Super Admin at `/`. Invite one Restaurant Admin and share the one-time link privately; email delivery is not built in. The invitee sets a password and signs in.
4. The Restaurant Admin can edit menu names/prices, availability, images, categories, and internal food-cost targets. Preview changes and publish them before customers see them.
5. Open the PUBLIQ QR section and download the PNG. Scan it on a phone while signed out. It opens `/menu.html?slug=publiq-superclub`; no customer login is required.
6. Future changes keep using the same slug and QR code. The current database-backed snapshot is used whenever a PUBLIQ restaurant record exists; the read-only fallback is used only when that database record does not exist.

Menu Editors can be invited with limited restaurant-specific permissions after a Super Admin enables Menu Editor management for PUBLIQ. The server checks those permissions; hiding a control in the UI is not the security boundary.

## 7. Deploy to a managed Node.js web host

This app is a conventional long-running Express server. The steps below fit most managed Node web-service products; the provider's labels may differ. The service must support Node.js, environment variables/secrets, outbound MongoDB connections, and a persistent disk **if you keep using the current local photo upload implementation**.

### A. Prepare MongoDB for production

- Use a production database and a dedicated least-privilege app user; do not reuse a personal database credential.
- Set backups/point-in-time recovery according to your needs and test that you can restore them.
- Restrict network access to the app host's outbound IP/private network when possible.
- Keep the connection string only in your provider's secret store. Do not put it in source control or a public repository.

### B. Upload the project source

Either connect a private Git repository containing the extracted project or use the host's supported source/CLI deployment method. Include `package-lock.json`; do not upload `.env`, `node_modules`, database exports, or private uploads.

Typical service settings:

| Setting | Value |
|---|---|
| Runtime | Node.js 20+ (prefer a maintained LTS release) |
| Project/root directory | The folder containing `package.json` |
| Build/install command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health-check path, if required | `/` (there is no separate unauthenticated `/health` endpoint) |

The server listens on the `PORT` environment variable provided by the host, or 3000 if none is provided. Do not configure a health check against `/api/admin/health`; that endpoint requires an authenticated Super Admin.

### C. Set production environment variables

Set these in the service's private environment settings. Replace example values with your real ones:

```dotenv
NODE_ENV=production
MONGODB_URI=mongodb+srv://APP_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=qr_restaurant_menu
PUBLIC_BASE_URL=https://menus.example.com
DEMO_MODE=false
SESSION_TTL_HOURS=12
INVITATION_TTL_HOURS=48
UPLOAD_MAX_MB=5
```

`PUBLIC_BASE_URL` must be the **public HTTPS origin only**: scheme plus host, with no path and preferably no trailing slash. It is used to build QR and invitation links. For example, use `https://menus.example.com`, not `http://...` and not `https://menus.example.com/app`.

Do not copy a local `.env` file to the web root or commit it. The hosting provider should terminate HTTPS and forward requests to the Node service. With `NODE_ENV=production`, the app requires an HTTPS `PUBLIC_BASE_URL` and marks admin session cookies Secure.

### D. Connect your domain and TLS

1. Add your domain as a custom domain in the hosting service.
2. Follow the host's instructions to create the required DNS records.
3. Wait for the host to issue/enable HTTPS and verify the site loads securely.
4. Set `PUBLIC_BASE_URL` to that exact HTTPS origin and redeploy/restart.

The app is designed to be hosted at the domain root, not under a URL subpath. If your domain uses `www`, choose the canonical host and set `PUBLIC_BASE_URL` to that same host.

### E. Bootstrap, seed, and launch

Bootstrap must connect to the **production MongoDB database**, not your local development database. You may run it from your computer if Atlas allows your trusted IP, or from the host's one-off command/console environment if available. Use the same `MONGODB_URI` and `MONGODB_DB` as the web service. Enter the password interactively when possible. Do not leave temporary bootstrap password variables configured after success.

Run `npm run seed:publiq-menu` once against that same production database. The seed refuses to overwrite an existing PUBLIQ record and creates no admin account. Then deploy/start the web service. Check:

- `https://menus.example.com/` displays the admin sign-in.
- `https://menus.example.com/menu.html?slug=publiq-superclub` is the public PUBLIQ customer menu; no login is required.
- An unauthenticated request to `/api/admin/overview` returns `401`; that is expected.
- Invite the Restaurant Admin, then scan the generated PUBLIQ QR from a phone while signed out.

## 8. Important production limitations

Read these before using the scaffold for real customers:

- **Photo uploads are stored on the app server's local filesystem** in `public/uploads/`. Many managed web hosts use ephemeral filesystems, so photos can disappear after a restart/deploy unless you attach persistent storage. A single persistent disk is still not shared across multiple app instances. For a scalable production deployment, move uploads to object storage (for example, S3-compatible storage) and adapt the app to use it.
- **Invitation delivery is manual.** There is no email provider, password reset, MFA, or automated account recovery. Share invitation links privately and only with the intended user.
- **Publication metadata and snapshots are not wrapped in a MongoDB transaction in this scaffold.** Before a high-availability or high-volume production launch, add and test a durable atomic publication workflow using MongoDB transactions or an equivalent approach.
- The offline menu can continue displaying a previously saved snapshot until the device reconnects. Test your desired suspension/unpublishing and customer support procedures.
- The included browser and API tests use an in-memory database. They do not replace production MongoDB, backup/restore, security, accessibility, or real-device testing.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Server says `MONGODB_URI is required` | Set a valid MongoDB URI and keep `DEMO_MODE=false` for persistent data. |
| MongoDB connection fails | Check the URI, database-user permissions, IP/network access rules, and whether the cluster is running. |
| Bootstrap says a Super Admin already exists | Bootstrap is one-time. Sign in with the existing Super Admin; do not delete accounts or rerun bootstrap to reset a password. |
| Sign-in page appears when you scan a QR | Check that the QR encodes `/menu.html?slug=publiq-superclub`, not just the site root. Customers do not need accounts. |
| Public menu says unavailable/not published | Confirm the PUBLIQ seed completed, or check that the restaurant is active and has a published snapshot. If a database restaurant record exists, the fallback is intentionally not used in place of its unpublished/suspended menu. |
| QR opens the wrong hostname | Correct `PUBLIC_BASE_URL`, restart/redeploy, generate a new QR, and test it before printing. |
| Photos disappear after deployment | The host likely has ephemeral storage. Configure a persistent disk for a single instance or migrate uploads to object storage. |

## Quick command reference

```sh
npm ci
npm test
npm run bootstrap:super-admin
npm run seed:publiq-menu
npm start
```

For Chromium browser checks, install Chromium once with `npx playwright install chromium`, then run `npm run test:browser`.
