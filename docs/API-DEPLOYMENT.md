# StudioSpace API — Vercel backend

The Express API is deployed as Vercel project `as`, linked to the public GitHub repository:

https://github.com/samscaleup777/AS-backend

Vercel detects the Express app from the default export in `src/index.ts`. The project uses the repository root, Express framework detection and Node.js 22.

## Deployment

- Vercel project: `as`
- Project domain: https://as-two-lac.vercel.app
- Health endpoint: https://as-two-lac.vercel.app/health
- Latest Production build: `READY`

## Environment

- `MONGODB_URI`: sensitive URI using the dedicated Atlas API user `studiospace_api`, with only `readWrite` on `studiospace`.
- `MONGODB_DB=studiospace`
- `AUTH_BASE_URL=https://as-kappa-six.vercel.app`
- `CLIENT_ORIGIN=https://as-kappa-six.vercel.app`
- `NODE_ENV=production`

The MongoDB connection string is stored as a sensitive Vercel environment variable; it is not committed to Git.

## Frontend connection

The Next.js frontend proxy forwards requests to `API_SERVER_URL=https://as-two-lac.vercel.app`. The frontend origin is `https://as-kappa-six.vercel.app`, which is also the Better Auth issuer and allowed client origin.

## Live validation

- `GET /health` returned HTTP 200.
- `GET /api/studios/featured` returned HTTP 200 with six sample studio documents.
- `GET /api/server/studios/featured` through the frontend proxy returned HTTP 200.

The MongoDB Atlas index names were aligned with the existing database indexes to avoid index-option conflicts on first connection.

## Remaining validation

Complete the browser sign-in/JWT-cookie protected route test, ownership checks, booking status transitions, confirmed-overlap rejection and Google OAuth callback test.