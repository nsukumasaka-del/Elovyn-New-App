# Welcome to your project

## Project info

**URL**: [Your project URL]

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the app with its Cloudflare Pages API and local D1 database.
npm run dev
```

`npm run dev` builds the frontend and starts the Cloudflare Pages runtime so the
store API and local D1 database work together. It does not provide Vite HMR;
use `npm run dev:vite` for frontend-only work, where `/api` routes are not
available.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deploy to Cloudflare Pages

See [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) for D1, R2, secret, and
Cloudflare Pages configuration instructions. The Pages build uses
`npm run build`; Cloudflare installs from the committed npm lockfile. When
using Workers Builds with a custom deploy command, set it to
`npm run deploy:cloudflare` (not `wrangler deploy`).

## Can I connect a custom domain to my project?

Yes, you can connect a custom domain through your hosting provider's settings.
