# StudioSpace API — Vercel backend

The Express API is deployed as a separate Vercel Express project, `as-api`, using the repository's `server/` root directory.

The project install command extracts `server/.source/server-*.b64` into the server root and installs Node dependencies. Vercel detects Express from `src/index.ts` and runs the app as a serverless Express function.

API environment:
- `MONGODB_URI`: sensitive URI for the database-scoped `studiospace_app` user.
- `MONGODB_DB=studiospace`
- `AUTH_BASE_URL=https://as-hk777.vercel.app`
- `CLIENT_ORIGIN=https://as-hk777.vercel.app`
- `NODE_ENV=production`

Health endpoint: `/health`. API base URL is assigned by Vercel after the first deployment is ready. Set it in the frontend `API_SERVER_URL` variable and redeploy the frontend.

Backend public source is included under `server/.source` in this full-stack repo. The assignment still requires a separate public backend repository, which must be created as `AS-server` from GitHub and populated with the extracted server source.
