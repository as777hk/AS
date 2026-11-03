# StudioSpace — B14-A8-Cat_Harry

A full-stack peer-to-peer creative workspace and production studio marketplace. Hosts publish studios; creators discover spaces and request bookings.

## Source layout and build bootstrap

The client source is stored in Git as base64 shards under `client/.source`. The deployment install command extracts those files before installing and building the Next.js app. The standalone Express API has a separate, readable source repository: [AS-backend](https://github.com/samscaleup777/AS-backend).

To reconstruct the client locally:

```bash
cd client
cat .source/client-*.b64 | base64 -d | tar -xz --strip-components=1
npm install
npm run dev
```

For the API, clone [AS-backend](https://github.com/samscaleup777/AS-backend), copy `.env.example` to `.env`, configure the values, then run `npm install && npm run dev`.

## Assignment features

- Three-slide Swiper hero, six dynamic featured studios, five category filters, homepage section anchors and responsive navigation/footer.
- Better Auth email/password registration and login, Google OAuth when credentials are configured, callback-route preservation and examiner auto-fill.
- Public studio discovery/details, image gallery, host details, reviews display, owner-only add/edit/delete and read-only host identity.
- Booking modal with server-side price calculation, Pending workflow, customer cancellation, host status management and confirmed-time overlap prevention.
- JWT validation in an HTTPOnly cookie for Express mutations, Light/Dark mode, saved studios and confirmed-booking PDF invoice.
- Loading skeletons, custom 404, empty states, Sonner toasts and custom confirmation dialogs.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, Better Auth, MongoDB adapter, Express.js, MongoDB, Zod, jose, Swiper, next-themes, Sonner and jsPDF.

## Live deployment

- **Frontend:** https://as-kappa-six.vercel.app
- **Backend API:** https://as-two-lac.vercel.app
- **Health check:** https://as-two-lac.vercel.app/health
- **Frontend Vercel project:** `as-frontend`
- **Backend Vercel project:** `as`

The latest frontend and backend Vercel builds are marked `READY`. Database-backed routes still require the Atlas connection string to be added to the new `as` backend project's environment.

## Environment configuration

Frontend Vercel variables include `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `API_SERVER_URL`, `MONGODB_URI`, `MONGODB_DB` and `BETTER_AUTH_SECRET`. Add Google OAuth web credentials to enable Google sign-in.

Backend variables: `MONGODB_URI` (sensitive), `MONGODB_DB=studiospace`, `AUTH_BASE_URL=https://as-kappa-six.vercel.app`, `CLIENT_ORIGIN=https://as-kappa-six.vercel.app` and `NODE_ENV=production`.

Never commit real credentials.

## Examiner login

Login auto-fill is configured for the assessment-only account `examiner@studiospace.demo`. The account itself must still be created after the auth/database configuration is complete, using the included examiner creation script. Set and retain its password only in the private deployment environment; do not publish real credentials.

## GitHub and submission

- Client/full-stack repository: https://github.com/samscaleup777/AS
- Separate backend repository: https://github.com/samscaleup777/AS-backend
- Live client website: https://as-kappa-six.vercel.app

## Verification status

The Express backend TypeScript build and the Next.js frontend production build are both marked `READY`. The isolated booking-rules suite has 4 passing tests. Full live database connectivity, OAuth sign-in, examiner-account creation and browser end-to-end tests still need to be completed before describing the project as fully verified. The client repository's 15 meaningful feature commits also need a final commit-history review; the backend repository already has more than 8 backend-specific commits.