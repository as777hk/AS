# StudioSpace — B14-A8-Cat_Harry

StudioSpace is a peer-to-peer creative workspace and production studio marketplace. Hosts list spaces for photography, film, podcasts, music and art; creators discover studios and request bookings.

## Live application

- **Frontend:** https://as-kappa-six.vercel.app
- **Backend API:** https://as-two-lac.vercel.app
- **API status:** https://as-two-lac.vercel.app/
- **API health:** https://as-two-lac.vercel.app/health

## GitHub repositories

- **Client/full-stack:** https://github.com/samscaleup777/AS
- **Separate backend:** https://github.com/samscaleup777/AS-backend

The Next.js frontend source is readable under `client/src/`. The repository also retains deterministic source archive shards under `client/.source/` because the Vercel install step reconstructs the original source and applies the checked-in `client/patch-auth.mjs` build transformations before installing and building. The Express backend is maintained in its own repository with readable TypeScript files.

## Main features

- Three-slide Swiper landing hero, six dynamic featured studios, five category filters and responsive navigation with homepage hash links.
- Better Auth email/password sign-up and login, Google OAuth provider, callback route preservation and examiner demo autofill.
- Public studio directory and details with image gallery, specifications, amenities, host profile and reviews display.
- Private studio creation, owner-only editing and deletion, read-only host identity, input validation and confirmation dialogs.
- Booking requests with server-calculated hours and totals, Pending/Confirmed/Completed/Cancelled status flow, pending cancellation and confirmed-slot overlap prevention.
- Date-specific availability lookup; already-confirmed time windows are shown in the booking modal before a request is sent.
- JWT signature verification via JWKS and an HTTPOnly cookie for protected Express routes.
- Global Light/Dark theme, persistent saved-studio wishlist and downloadable PDF invoice for confirmed bookings.
- Newsletter subscription, loading skeletons, empty states, Sonner notifications, Terms page and custom illustrated 404.

## Technology stack

Next.js App Router, React 19, TypeScript, Tailwind CSS, Better Auth, MongoDB adapter, Express 5, MongoDB, Zod, jose, Swiper, next-themes, Sonner and jsPDF 4.2.1.

## Local setup

### Frontend

```bash
cd client
npm install
npm run dev
```

Create a `.env.local` with local values for `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `MONGODB_URI`, `MONGODB_DB`, `NEXT_PUBLIC_SITE_URL`, `API_SERVER_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The frontend expects the API to be reachable at `API_SERVER_URL`.

### Backend

```bash
git clone https://github.com/samscaleup777/AS-backend.git
cd AS-backend
cp .env.example .env
npm install
npm run dev
```

Set `MONGODB_URI`, `MONGODB_DB=studiospace`, `AUTH_BASE_URL` (the frontend origin) and `CLIENT_ORIGIN` (the frontend origin). The local API listens on port 4000 by default.

Run backend compilation and booking rule tests:

```bash
npm run build
npm test
```

## Examiner account

- **Email:** `examiner@studiospace.demo`
- **Password:** `StudioSpace!2026`

The examiner account has been created in the assessment database. The Login page includes examiner autofill. These are public assessment-demo credentials and must not be reused for a real service.

## Sample database data

Six illustrative sample studio listings are present in the `studiospace` database. All six are demo entries assigned to the examiner account; they are sample content, not verified real-world businesses.

## Deployment projects

- Vercel **`as-frontend`**: Next.js frontend, connected to `samscaleup777/AS`.
- Vercel **`as`**: Express backend, connected to `samscaleup777/AS-backend`.

The obsolete `as-api` project has been removed. Keep the frontend and backend projects separate.

## Verification status

- Latest frontend Production deployment: `READY`; Next.js production build and TypeScript pass, 13/13 static pages are generated.
- Latest clean-source ESLint run: 0 errors and 7 non-blocking `@next/next/no-img-element` warnings for dynamically supplied images.
- Backend TypeScript build passes; isolated booking rule suite passes 4/4 tests.
- Production dependency audit reports zero production vulnerabilities after the jsPDF 4.2.1 upgrade. Sixteen moderate findings remain in development-only lint tooling.
- Live checks have returned HTTP 200 for frontend pages, API root, API health, featured studios, availability lookup, frontend API proxy and Better Auth JWKS. Protected routes correctly return HTTP 401 without an authenticated session.

A final human browser pass is still required for completing Google consent/callback and signing in with the examiner account to exercise private CRUD, booking, JWT-cookie refresh, wishlist and invoice-download interactions. Do not represent those account-interactive flows as browser-tested until they have been completed.
