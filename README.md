# StudioSpace — B14-A8-Cat_Harry

A full-stack peer-to-peer creative workspace and production studio marketplace. Hosts publish studios; creators discover spaces and request bookings.

## Source layout and build bootstrap

The application source bundles are stored in Git as base64 shards so Vercel/Render can bootstrap the monorepo without a local Git push. The deployment install/build commands extract those archives into `client/` and `server/`.

To reconstruct a local checkout:

```bash
cd client
cat .source/client-*.b64 | base64 -d | tar -xz --strip-components=1
cd ../server
cat .source/server-*.b64 | base64 -d | tar -xz --strip-components=1
```

The extracted folders contain the readable application source, README files, environment examples, tests and local scripts.

## Assignment features covered

- Three-slide Swiper hero, six dynamic featured studios (`.limit(6)`), five category filters, homepage section anchors and responsive navigation/footer.
- Better Auth email/password registration and login, Google OAuth when credentials are configured, callback-route preservation and examiner auto-fill.
- Public studio discovery/details, image gallery, host details, reviews display, owner-only add/edit/delete and read-only host identity.
- Booking modal with server-side price calculation, Pending workflow, customer cancellation, host status management and confirmed-time overlap prevention.
- JWT validation in an HTTPOnly cookie for Express mutations, Light/Dark mode, saved studios and confirmed-booking PDF invoice.
- Loading skeletons, custom 404, empty states, Sonner toasts and custom confirmation dialogs.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, Better Auth, MongoDB adapter, Express.js, MongoDB, Zod, jose, Swiper, next-themes, Sonner and jsPDF.

## Local setup

1. Use Node.js 22+ and a MongoDB Atlas database.
2. Extract the client and server bundles using the commands above.
3. Copy `client/.env.example` to `client/.env.local`, and `server/.env.example` to `server/.env`.
4. Configure the same `MONGODB_URI`, `MONGODB_DB`, Better Auth secret and base URL in both apps.
5. Add Google OAuth web client credentials and its callback URL to enable Google login.
6. In `server/`, run `npm install && npm run dev` (port 4000).
7. In `client/`, run `npm install && npm run dev` (port 3000).

## Deployment configuration

- Vercel project: `as`, team `AS777`, Node.js 22, root directory `client`.
- The Vercel install command extracts the client source shards before `npm install`.
- `render.yaml` defines the Express API service; Render must be connected to this repository and receive its environment variables.
- MongoDB database name is `studiospace`; the Atlas app user is scoped to that database.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for all environment variables and validation steps. Never commit real credentials.

## Examiner login

The login auto-fill is configured for the assessment-only account `examiner@studiospace.demo` / `StudioSpace!2026`. The account itself must be created after deployment using the included examiner creation script and the configured Better Auth environment. Change/remove it after assessment.

## GitHub and submission

- Client/full-stack repository: https://github.com/samscaleup777/AS
- Separate backend repository: the GitHub connector used for this session cannot create repositories. Create a public `AS-server` repository and publish the extracted `server/` folder before final submission.
- Live Next.js website: publish the generated Vercel production URL only after the deployment is reported as `READY`.

## Verification status

The booking-rules test suite has 4 passing isolated tests. Full dependency installation, full Next.js and Express builds, Google OAuth, browser end-to-end checks, separate backend repository publication and live deployment still require the external setup described in the deployment guide. Do not treat the application as production-verified until those checks pass.
