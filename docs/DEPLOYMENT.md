# StudioSpace deployment guide

## Vercel frontend

- Project: `as-frontend`
- Framework: Next.js, Node.js 22.x
- Live origin: https://as-kappa-six.vercel.app
- Repository: https://github.com/samscaleup777/AS
- The install command extracts client source shards before building.

Environment variables include:
- `MONGODB_URI` (sensitive)
- `MONGODB_DB=studiospace`
- `BETTER_AUTH_SECRET` (sensitive)
- `BETTER_AUTH_URL=https://as-kappa-six.vercel.app`
- `NEXT_PUBLIC_SITE_URL=https://as-kappa-six.vercel.app`
- `API_SERVER_URL=https://as-two-lac.vercel.app`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (not yet configured)
- `NEXT_PUBLIC_EXAMINER_EMAIL=examiner@studiospace.demo`
- `NEXT_PUBLIC_EXAMINER_PASSWORD=StudioSpace!2026` (public assignment-demo credential)

## Vercel backend

- Project: `as`
- Framework: Express, Node.js 22.x
- Repository: https://github.com/samscaleup777/AS-backend
- Backend domain: https://as-two-lac.vercel.app
- Health endpoint: https://as-two-lac.vercel.app/health

Environment variables:
- `MONGODB_URI`: sensitive URI using dedicated Atlas account `studiospace_api`.
- `MONGODB_DB=studiospace`
- `AUTH_BASE_URL=https://as-kappa-six.vercel.app`
- `CLIENT_ORIGIN=https://as-kappa-six.vercel.app`
- `NODE_ENV=production`

The API health check and featured studio endpoint have both returned HTTP 200. The frontend API proxy has also returned HTTP 200.

## Google OAuth setup

In Google Cloud Console, create an OAuth 2.0 Client ID of type Web application. Add the following Authorized JavaScript origin:

`https://as-kappa-six.vercel.app`

Add this Authorized redirect URI:

`https://as-kappa-six.vercel.app/api/auth/callback/google`

Copy the Client ID and Client Secret into Vercel project `as-frontend` as sensitive variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy.

## MongoDB and sample data

Atlas database: `studiospace`. The API-specific user has only `readWrite` access to this database. Six illustrative demo studio listings are seeded and owned by `examiner@studiospace.demo`. Better Auth examiner account has been created.

## Examiner credentials

- Email: `examiner@studiospace.demo`
- Password: `StudioSpace!2026`

These are public assignment-demo credentials; do not reuse them for a real service.

## Manual browser QA

1. Sign in with the examiner account and refresh private routes.
2. Add, edit and delete a studio; verify a different account cannot alter another host's listing.
3. Create a booking; check the displayed amount includes hourly rate and deposit.
4. Cancel a Pending booking.
5. Confirm a booking as host, then attempt an overlapping request; it must be rejected.
6. Test wishlist save/remove and the confirmed-booking PDF invoice.
7. Test theme toggle, hash links, category filters, Terms page, not-found page, empty states and mobile layout.
8. Configure Google OAuth and verify its callback.
9. Review client commit history for at least 15 meaningful frontend commits and backend history for 8 meaningful server commits.