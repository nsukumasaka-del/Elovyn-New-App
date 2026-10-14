# Cloudflare Pages, D1, and R2 setup

The storefront is a Vite single-page app served by Cloudflare Pages. Its API is
implemented as Pages Functions in `functions/`. D1 stores users, sessions,
products, orders, supplier settings, and signed-in carts. R2 stores product
image uploads.

## Create and bind storage

1. Create a D1 database:

   ```sh
   npx wrangler d1 create elovyn-store
   ```

   Replace the all-zero placeholder `database_id` in `wrangler.toml` with the
   returned database ID.
2. Create the R2 bucket:

   ```sh
   npx wrangler r2 bucket create elovyn-product-assets
   ```

3. Apply the schema and seed migrations:

   ```sh
   npx wrangler d1 migrations apply elovyn-store --remote
   ```

The `DB` D1 and `PRODUCT_ASSETS` R2 bindings are declared in `wrangler.toml`.
The API initializes Drizzle from `env.DB` for each request; it does not depend
on a process-global database connection.

## Configure Pages

Create a Cloudflare Pages project connected to this repository and set:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

The repository uses `package-lock.json` and does not include a Bun lockfile, so
Cloudflare's automatic dependency installation uses npm rather than Bun's
frozen-lockfile mode. `wrangler.toml` provides the Pages output directory,
compatibility date, and production storage bindings.

If using Cloudflare Workers Builds with a custom deploy command, set it to
`npm run deploy:cloudflare`. This command builds the Vite site and deploys the
`dist` directory with `wrangler pages deploy`. Do not use `wrangler deploy`:
that command deploys Workers scripts, not this Pages project.

Configure separate D1 and R2 bindings for Cloudflare's Preview environment in
the Pages project settings before enabling preview deployments. Do not point
preview builds at the production database or assets bucket.

## Configure secrets

Generate the administrator password hash in an interactive terminal:

```sh
node scripts/hash-admin-password.mjs
```

Store the returned `pbkdf2$...` value as the server-side
`ADMIN_PASSWORD_HASH` secret:

```sh
npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name elovyn-store
```

Generate and store the encryption secret used for supplier API keys:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx wrangler pages secret put SUPPLIER_SECRET_ENCRYPTION_KEY --project-name elovyn-store
```

Keep the supplier encryption key backed up securely. Do not put either secret in
a `VITE_` variable or commit it to the repository.

## Local development and verification

Install from the committed lockfile, build the app, then run Pages locally:

```sh
npm ci
npm run build
npx wrangler pages dev dist
```

For local secrets, create a git-ignored `.dev.vars` file:

```dotenv
ADMIN_PASSWORD_HASH=pbkdf2$...
SUPPLIER_SECRET_ENCRYPTION_KEY=...
```

The local D1 emulator uses the configured binding and migrations. Apply them
locally with:

```sh
npx wrangler d1 migrations apply elovyn-store --local
```

After deployment, `/api/health` verifies the function route and D1 binding. A
successful response is `{"ok":true,"database":"connected"}`.

## Moving existing store data

D1 migrations create a new database and seed the catalogue; they do not copy
data from the previous database. Export and transform any customer, order,
supplier, cart, and product data before switching traffic. Existing product
images need to be copied into the R2 bucket. Existing customer password hashes using scrypt are not compatible with the
Workers Web Crypto PBKDF2 verifier. The app does not include a password-reset
flow, so plan a credential-reset process or require affected customers to
register new accounts; do not import the old hashes unchanged. Re-enter supplier
API keys after import so they are encrypted using the Cloudflare runtime format.

The administrator email remains fixed in the API. The password is checked
against `ADMIN_PASSWORD_HASH`; browser sessions use an HttpOnly cookie and
hashed random tokens stored in D1. Admin authorization is enforced in the API.

Online checkout remains disabled until a payment provider is configured.
Supplier settings can be recorded, but a supplier-specific adapter, credential
verification, webhook handler, and scheduled sync are not implemented yet.
