# StudioSpace — Creative Workspace Marketplace

A full-stack assignment implementation for a peer-to-peer marketplace connecting creative workspace hosts with creators.

## Repository contents

- `client/` — Next.js App Router frontend, Better Auth, studio browsing and management, booking interface, wishlist, PDF invoice, theme switcher and API proxy.
- `server/` — Express API, MongoDB collections and indexes, Better Auth JWT/JWKS verification, studio CRUD, booking workflow, confirmed-slot collision checks, newsletter and wishlist APIs.
- `docs/` — environment and deployment instructions.
- `render.yaml` — Render service blueprint for the Express API.

## Main features

- Responsive homepage with a three-slide Swiper hero, six latest featured studios and five category filters.
- Email/password registration and login, Google OAuth when configured, callback URL preservation and private pages.
- Studio discovery, gallery details, owner-only create/update/delete, amenities and read-only host identity.
- Booking modal with server-side price calculation, Pending requests, host confirmation/decline, customer cancellation and confirmed-booking overlap checks.
- Whole-site light/dark theme, wishlist, confirmed-booking PDF invoice, skeleton loading, empty states, toast notifications and custom 404.

## Stack

Next.js App Router, React, TypeScript, Better Auth, MongoDB adapter, Express.js, MongoDB, Zod, jose, Swiper, next-themes, Sonner and jsPDF.

## Local setup

1. Use Node.js 22+ and a MongoDB Atlas or local MongoDB database.
2. Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`.
3. Configure the same MongoDB database and Better Auth base URL/secret in both apps. Add Google OAuth credentials to enable Google login.
4. In `server/`, run `npm install` and `npm run dev` (default port 4000).
5. In `client/`, run `npm install` and `npm run dev` (default port 3000).
6. Register a user at `http://localhost:3000/register`.

## Environment and deployment

See [Deployment Guide](docs/DEPLOYMENT.md). Never commit real credentials. Vercel project name: `as`, frontend root directory: `client`. The Express API can be deployed with the included Render blueprint.

## Examiner credentials

Create an assignment-only examiner user after deployment with:

```bash
cd client
BETTER_AUTH_URL=https://YOUR_FRONTEND_DOMAIN \
EXAMINER_EMAIL=examiner@studiospace.demo \
EXAMINER_PASSWORD=StudioSpace!2026 \
npm run create:examiner
```

The login page's examiner auto-fill matches these values. The account is not automatically seeded; run the command above after configuring the live site. Remove or change it after assessment.

## Submission links

- Client/full-stack source repository: https://github.com/samscaleup777/AS
- Separate backend repository: create a public `AS-server` repository and push this repository's `server/` folder; current GitHub connector permissions do not include repository creation.
- Live Next.js URL: add the production URL after Vercel reports the deployment as READY.

## Required final checks

Run `npm run build` in both apps and `npm test` in `server/`. Then test registration, Google OAuth, refresh on every private route, studio ownership, booking overlap, pending cancellation, host status updates, wishlist, invoice export, and both themes on the deployed URLs.