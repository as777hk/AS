# StudioSpace deployment guide

## Vercel frontend

- Project: `as-frontend`
- Framework: Next.js
- Live origin: https://as-kappa-six.vercel.app
- Repository: https://github.com/samscaleup777/AS
- The install command extracts the client source shards from `.source/client-*.b64` before installing dependencies and building.

Environment variables:
- `MONGODB_URI`: sensitive MongoDB Atlas URI (already configured on the frontend project).
- `MONGODB_DB=studiospace`.
- `BETTER_AUTH_SECRET`: sensitive Better Auth secret (already configured).
- `BETTER_AUTH_URL=https://as-kappa-six.vercel.app`.
- `NEXT_PUBLIC_SITE_URL=https://as-kappa-six.vercel.app`.
- `API_SERVER_URL=https://as-two-lac.vercel.app`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: required to enable Google sign-in.
- `NEXT_PUBLIC_EXAMINER_EMAIL`, `NEXT_PUBLIC_EXAMINER_PASSWORD`: assessment-only auto-fill values; create the actual examiner user after auth is working.

## Vercel backend

- Project: `as`
- Framework: Express
- Repository: https://github.com/samscaleup777/AS-backend
- Node.js: 22.x
- Backend domain: https://as-two-lac.vercel.app
- Health endpoint: https://as-two-lac.vercel.app/health

Environment variables:
- `MONGODB_URI`: add the same Atlas URI as a sensitive variable in the new `as` project.
- `MONGODB_DB=studiospace`.
- `AUTH_BASE_URL=https://as-kappa-six.vercel.app`.
- `CLIENT_ORIGIN=https://as-kappa-six.vercel.app`.
- `NODE_ENV=production`.

The non-secret backend values are already configured. The database URI is the remaining backend environment value to add. Redeploy after changing environment variables.

## Google OAuth setup

In Google Cloud Console, create an OAuth 2.0 Client ID of type Web application. Add the frontend origin to Authorized JavaScript origins and this callback to Authorized redirect URIs:

`https://as-kappa-six.vercel.app/api/auth/callback/google`

Copy the Client ID and Client Secret into the frontend Vercel project's `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` variables (sensitive), then redeploy the frontend.

## MongoDB

Atlas database: `studiospace`. The dedicated `studiospace_app` user has `readWrite` access to that database. Collections created: `studios`, `bookings`, `bookingLocks`, `wishlists`, `newsletters`, `reviews`. The Express application creates indexes on first connection.

## Final checks

1. Confirm the backend `/health` endpoint returns success.
2. Add `MONGODB_URI` and verify `/api/studios/featured` returns a data array.
3. Complete email/password registration and log in; refresh `/my-listings` and `/my-bookings`.
4. Test adding, editing and deleting a studio, including non-owner access denial.
5. Test booking totals, Pending cancellation and host status updates.
6. Confirm one booking and attempt an overlapping time slot; it must be rejected.
7. Test wishlist persistence and confirmed-booking PDF invoice.
8. Test light/dark mode, hash links, category filters, empty states, not-found page and mobile layout.
9. Configure Google OAuth and verify its callback.
10. Create the examiner account with the provided script.
11. Confirm at least 15 meaningful frontend commits and 8 backend commits exist in the public repositories.