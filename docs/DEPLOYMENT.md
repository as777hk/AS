# StudioSpace deployment guide

## Vercel client

The project `as` is already configured with the `client` root directory, Next.js framework, Node.js 22 and an archive-extraction install command. Once source shards are committed, the first Vercel build will extract `client/.source/client-*.b64` and run `npm install`.

Environment variables:
- `MONGODB_URI`: dedicated StudioSpace database connection (already configured as a sensitive Vercel variable).
- `MONGODB_DB=studiospace` (already configured).
- `BETTER_AUTH_SECRET`: sensitive random secret (already configured).
- `BETTER_AUTH_URL`: exact production frontend origin, e.g. `https://as-<team>.vercel.app`.
- `NEXT_PUBLIC_SITE_URL`: same exact frontend origin.
- `API_SERVER_URL`: Render backend origin after the API service is deployed, e.g. `https://studiospace-api.onrender.com`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: create a Google OAuth Web application and add callback `https://<frontend-origin>/api/auth/callback/google`.
- `NEXT_PUBLIC_EXAMINER_EMAIL` / `NEXT_PUBLIC_EXAMINER_PASSWORD`: assessment-only auto-fill values already configured. The user must still be created with the supplied script after deployment.

After changing environment values, trigger a new deployment.

## Render API

The root `render.yaml` defines the Express web service with root directory `server`. Render's build command unpacks `server/.source/server-*.b64` before installing and compiling.

Set these service variables in Render:
- `NODE_ENV=production`
- `MONGODB_URI`: same dedicated MongoDB connection (set as a secret; do not place it in a public file).
- `MONGODB_DB=studiospace`
- `AUTH_BASE_URL`: same exact origin as `BETTER_AUTH_URL`.
- `CLIENT_ORIGIN`: same exact frontend origin as `BETTER_AUTH_URL`.
- `PORT`: supplied automatically by Render.

Deploy the Render service and copy its public HTTPS URL into Vercel's `API_SERVER_URL`.

## MongoDB

A free Atlas cluster is already available in the connected Atlas account. A dedicated `studiospace_app` database user was created with `readWrite` on only the `studiospace` database. Collections created: `studios`, `bookings`, `bookingLocks`, `wishlists`, `newsletters`, `reviews`. The Express application creates required indexes when it first connects.

## Final checks

1. Confirm the Express `/health` endpoint returns success.
2. Complete an email/password registration and log in; refresh `/my-listings` and `/my-bookings`.
3. Test add/edit/delete studio with a second user to verify ownership boundaries.
4. Test booking calculation and Pending cancellation.
5. Confirm one booking and attempt an overlapping confirmed slot; it must be rejected.
6. Confirm host status management, wishlist persistence and invoice PDF.
7. Test light/dark mode, all deep links, categories, empty states and mobile layout.
8. Add Google OAuth credentials and verify its callback.
9. Create the assessment-only examiner account using `client/scripts/create-examiner.mjs`.
10. Run both production builds and the server unit tests before assignment submission.
