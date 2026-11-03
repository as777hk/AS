# StudioSpace API — Vercel backend

The Express API is deployed as a separate Vercel project named `as`, linked to the public GitHub repository:

https://github.com/samscaleup777/AS-backend

Vercel detects the Express app from the default export in `src/index.ts`. The project uses the repository root, Express framework detection and Node.js 22.

## Deployment

- Vercel project: `as`
- Project domain: https://as-two-lac.vercel.app
- Health endpoint: https://as-two-lac.vercel.app/health
- Latest TypeScript production build: `READY`

## Environment variables

- `MONGODB_URI`: sensitive URI for the database-scoped `studiospace_app` user. This must be added to the new `as` project before database-backed routes can work.
- `MONGODB_DB=studiospace`
- `AUTH_BASE_URL=https://as-kappa-six.vercel.app`
- `CLIENT_ORIGIN=https://as-kappa-six.vercel.app`
- `NODE_ENV=production`

Set the same Atlas URI already used by the frontend. Keep it as a sensitive Vercel environment variable; never commit it.

## Frontend connection

The Next.js frontend proxy forwards requests to `API_SERVER_URL=https://as-two-lac.vercel.app`. The frontend origin is `https://as-kappa-six.vercel.app`, which must remain the Better Auth issuer and allowed client origin.

## Validation

1. Confirm `GET /health` returns JSON with `status: "ok"`.
2. After setting `MONGODB_URI`, verify `GET /api/studios/featured`.
3. Verify the HttpOnly `better_auth_jwt` cookie is issued by the frontend and accepted by protected routes.
4. Verify ownership checks and confirmed-slot collision prevention.