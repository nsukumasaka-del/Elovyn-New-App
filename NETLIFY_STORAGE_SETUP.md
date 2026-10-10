# Netlify storage and store setup

The application uses Netlify Database (managed Postgres) for accounts, sessions,
products, orders, and supplier settings. Netlify Blobs stores authenticated carts
and product image uploads. Netlify Database is Postgres; it is not Turso or
SQLite. The schema migration is in `netlify/database/migrations/0001_store_core.sql`
and is applied by Netlify on deploy previews and production deploys.

## Configure the Netlify site

1. Enable Netlify Database for the site in the Netlify dashboard. Netlify makes
   the database connection available to functions as `NETLIFY_DB_URL`.
2. Add the following server-only environment variables in the Netlify dashboard:
   - `ADMIN_PASSWORD_HASH`: generate it with `node scripts/hash-admin-password.mjs`
     in an interactive terminal. Paste the returned `scrypt$...` value into
     Netlify; the password is entered without being echoed or saved in this repo.
   - `SUPPLIER_SECRET_ENCRYPTION_KEY`: generate a random 32-byte key with
     `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
     and save it as a Netlify secret. Keep a secure backup; changing it prevents
     previously stored supplier keys from being decrypted by future adapters.
3. Deploy the site. Netlify applies the migration before publishing. The
   migration seeds the current storefront products and inventory.
4. Link the site locally with the Netlify CLI and use `netlify dev` to run the
   functions and access the site's development database and Blobs stores.

Do not use `VITE_` variables for credentials: Vite embeds those values in
browser-delivered assets. The primary administrator email is fixed on the
server; the password itself is verified against the server-only password hash.
The browser receives only an HttpOnly, SameSite session cookie whose random
token is stored as a hash in the database. Admin data and mutations are checked
again inside the function; hiding the admin link is not the security boundary.

## API and storage behavior

- `/api/auth/*` registers and authenticates customers and issues/revokes sessions.
- `/api/cart` stores signed-in users' cart IDs and quantities in Netlify Blobs.
  Guest cart display state remains in that browser's local storage until sign-in.
- `/api/orders` requires an authenticated user. Order placement is deliberately
  disabled until a payment provider is configured; failed attempts do not
  create orders, clear the cart, or alter inventory.
- `/api/admin/*` is restricted to the configured primary administrator.
- Product image uploads are validated and stored in the `elovyn-product-assets`
  Blobs store. Public image reads are served through `/api/assets/:key`.
- Supplier credentials are encrypted before they are stored. The supplier UI
  records settings and an auto-sync preference only; a supplier-specific API
  adapter, credential verification, webhook handler, and scheduled sync still
  need to be implemented for a real integration.

## Checkout limitation

There is no payment provider configured in this repository. Checkout is disabled
until one is selected and a server-side payment-intent/webhook flow is added.
Unconfigured checkout attempts do not create pending orders, clear customer
carts, or change inventory.
