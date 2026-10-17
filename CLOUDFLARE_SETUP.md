# Cloudflare Pages, D1, and R2 setup

The storefront is a Vite single-page app served by Cloudflare Pages. Its API is
implemented as Pages Functions in `functions/`. D1 stores users, sessions,
products, orders, supplier settings, and signed-in carts. R2 stores product
image uploads.

## Import and deploy the site

Create a Cloudflare Pages project connected to this repository and set:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

The initial deployment can publish the storefront before its storage resources
exist. The API will not be usable until the D1 and R2 resources are created and
bound in the next section.

`wrangler.toml` is intentionally limited to local development: it does not set
`pages_build_output_dir`, so production Pages settings and bindings remain
managed by the Cloudflare dashboard. Its all-zero D1 ID is only a local
emulator placeholder and must not be used for a production binding.

The repository uses `package-lock.json` and does not include a Bun lockfile, so
Cloudflare's automatic dependency installation uses npm rather than Bun's
frozen-lockfile mode.

## Create and bind storage

After the first deployment:

1. Create a D1 database named `elovyn-store` in **Workers & Pages → D1** (or run
   `npx wrangler d1 create elovyn-store` after authenticating Wrangler). Copy
   its UUID into the local `database_id` field in `wrangler.toml`; this enables
   the local D1 emulator and is not used as the production binding.
2. Create an R2 bucket named `elovyn-product-assets` in **R2** (or run
   `npx wrangler r2 bucket create elovyn-product-assets`).
3. Apply the schema and seed migrations:

   ```sh
   npx wrangler d1 migrations apply elovyn-store --remote
   ```

4. In the Pages project, open **Settings → Bindings** and add:
   - A D1 database binding named `DB`, connected to `elovyn-store`.
   - An R2 bucket binding named `PRODUCT_ASSETS`, connected to
     `elovyn-product-assets`.
5. Redeploy the Pages project so the Functions receive the new bindings.

The API initializes Drizzle from `env.DB` for each request; it does not depend
on a process-global database connection.

If using Cloudflare Workers Builds with a custom deploy command, set it to
`npm run deploy:cloudflare`. This command builds the Vite site and deploys the
`dist` directory with `wrangler pages deploy`. Do not use `wrangler deploy`:
that command deploys Workers scripts, not this Pages project.

### Configure a Cloudflare API token for deployment

For `npm run deploy:cloudflare`, create a scoped API token and make it available
to the deployment environment as `CLOUDFLARE_API_TOKEN`:

1. In the Cloudflare dashboard, open **My Profile → API Tokens** and choose
   **Create Token**.
2. Choose **Create Custom Token**.
3. Add the permission **Account → Cloudflare Pages → Edit** (listed as
   **Pages Write** in the API permission reference). This lets Wrangler inspect
   the Pages project and upload deployments.
4. Under **Account Resources**, select **Include → Specific account** and
   choose the account that owns `elovyn-store`.
5. Do not add zone permissions for a standard Pages deployment. Add
   **Zone → DNS → Edit** only if the deployment automation also manages DNS
   records or custom-domain configuration.
6. Create the token, copy it once, and add it to the build/deployment
   environment as the secret `CLOUDFLARE_API_TOKEN`. Do not commit it or expose
   it in a `VITE_` variable.

The token must be paired with the correct Cloudflare account. If Wrangler cannot
select the account automatically, set `CLOUDFLARE_ACCOUNT_ID` in the deployment
environment to that account's ID. For Cloudflare Pages' Git-integrated build
pipeline, use build command `npm run build` and output directory `dist`; that
pipeline handles deployment itself and does not need the custom deploy
command.

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

Install from the committed lockfile and start the local Pages runtime:

```sh
npm ci
npm run dev
```

This builds the frontend, applies pending migrations to the local D1 emulator,
and serves the app and Pages Functions together. The command uses Wrangler's
local D1 and R2 emulators; it does not change the remote database. To use Vite
HMR for frontend-only work, run `npm run dev:vite` instead; API requests require
the Pages runtime.

For local secrets, create a git-ignored `.dev.vars` file before starting the
server:

```dotenv
ADMIN_PASSWORD_HASH=pbkdf2$...
SUPPLIER_SECRET_ENCRYPTION_KEY=...
```

The `npm run dev` command applies pending migrations automatically. You can
also apply them manually with:

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
