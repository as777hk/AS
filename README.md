# StudioSpace — B14-A8-Cat_Harry

A full-stack peer-to-peer creative workspace and production studio marketplace. Hosts publish creative spaces; creators discover studios and request bookings.

## Source layout and local setup

The client source is stored as base64 shards under `client/.source`; the Vercel install command extracts the source before building the Next.js application.

Reconstruct the frontend locally:

```bash
cd client
cat .source/client-*.b64 | base64 -d | tar -xz --strip-components=1
npm install
npm run dev
```

The Express backend is maintained as a separate readable repository: [AS-backend](https://github.com/samscaleup777/AS-backend).

```bash
git clone https://github.com/samscaleup777/AS-backend.git
cd AS-backend
cp .env.example .env
# Configure MONGODB_URI, MONGODB_DB, AUTH_BASE_URL and CLIENT_ORIGIN
npm install
npm run dev
```

## Features

- Three-slide Swiper hero, six live featured studios, five category filters, homepage anchors and responsive navigation/footer.
- Better Auth email/password registration and login, Google OAuth support when provider credentials are configured, callback return and examiner auto-fill.
- Public studio discovery/details, image gallery, amenities, host details, review display, and owner-only create/edit/delete.
- Booking requests with server-calculated totals, Pending/Confirmed/Completed/Cancelled states and confirmed-time collision prevention.
- JWT verification through an HTTPOnly cookie for protected Express routes.
- Global Light/Dark theme, saved-studio wishlist and downloadable PDF invoice for confirmed bookings.
- Skeleton loading, empty states, Sonner toast notifications, custom confirmation flows and illustrated 404 page.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, Better Auth, MongoDB adapter, Express.js, MongoDB, Zod, jose, Swiper, next-themes, Sonner and jsPDF.

## Live deployment

- **Frontend:** https://as-kappa-six.vercel.app
- **Backend API:** https://as-two-lac.vercel.app
- **API health check:** https://as-two-lac.vercel.app/health
- **Frontend Vercel project:** `as-frontend`
- **Backend Vercel project:** `as`

Both latest Production builds are marked `READY`. The backend health endpoint has returned HTTP 200, the featured-studios API has returned HTTP 200 with six sample listings, and the frontend API proxy has also returned HTTP 200.

## Examiner credentials

- **Email:** `examiner@studiospace.demo`
- **Password:** `StudioSpace!2026`

The examiner account has been created in the StudioSpace database. The Login page's examiner auto-fill control is also configured for this account. These are public assignment-demo credentials, not private production credentials.

## Sample data

Six clearly named demo studio listings have been inserted into the `studiospace` database and belong to the examiner account. They are illustrative sample entries and should be replaced or edited for a real marketplace.

## Environment configuration

Frontend Vercel project `as-frontend` contains the Better Auth base URL and secret, frontend site URL, API server URL, MongoDB URI and database name. Google OAuth still requires a Web OAuth client ID and secret.

Backend Vercel project `as` has a separate sensitive MongoDB connection string using a dedicated Atlas user with `readWrite` permission on the `studiospace` database only. It also has `MONGODB_DB=studiospace`, `AUTH_BASE_URL`, `CLIENT_ORIGIN` and `NODE_ENV=production`.

Never commit database credentials, OAuth secrets or private production credentials.

## Submission links

- Client/full-stack repository: https://github.com/samscaleup777/AS
- Separate backend repository: https://github.com/samscaleup777/AS-backend
- Live client website: https://as-kappa-six.vercel.app

## Verification notes

Production builds and live public API/featured-listing endpoints have passed checks. The JWKS endpoint and unauthenticated session endpoint returned HTTP 200. The isolated booking-rules unit tests passed 4/4. A full browser end-to-end check of sign-in, JWT-cookie protected mutations, booking collision, Google OAuth and responsive interactions remains part of final manual QA.