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

Create a `.env.local` with local values for `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `MONGODB_URI`, `MONGODB_DB`, `NEXT_PUBLIC_SITE_URL`, `API_SERVER_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The frontend expects the API to be reachable at `API_SERVER_URL`. See the root `.env.example` for server-only email and image-upload settings.

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


## Studio image uploads

The Add Studio form supports both a hosted image URL and a local image upload. Local uploads are handled by the authenticated Next.js route `/api/upload`, which forwards the file to ImgBB without exposing the API key in the browser.

To enable local uploads in production:

1. Create an ImgBB API key at https://api.imgbb.com/.
2. In the Vercel **as-frontend** project, add `IMGBB_API_KEY` as a Sensitive environment variable for Production (and Preview/Development when needed).
3. Redeploy the frontend after saving the variable.

Only image files are accepted, with a maximum upload size of 32,000,000 bytes. The supported file picker formats are JPEG, PNG and WebP. The API key must remain server-side; do not rename it to a `NEXT_PUBLIC_*` variable. Pasting an already-hosted image URL remains available when uploads are not configured.


## Account security and email two-factor authentication

Email two-factor authentication (2FA) is optional and separate from account registration. The assignment requires signup to work without email verification, so StudioSpace keeps both `requireEmailVerification` and `sendVerificationOnSignUp` disabled. The password-based registration flow must not wait for an email code. Password recovery is intentionally unavailable for this assessment.

To enable email as a second-factor method:

1. Create a Resend account and verify the sending domain you will use.
2. In the Vercel **as-frontend** project, add `RESEND_API_KEY` as a Sensitive environment variable.
3. Add `AUTH_FROM_EMAIL` as the verified sender identity, for example `StudioSpace <accounts@your-verified-domain.com>`.
4. Add `EMAIL_2FA_ENABLED=true` as a server-side Plain environment variable. This flag only enables email 2FA after both sender settings are present.
5. Apply the values to Production. Add them to Preview and Development only when those environments should send real email.
6. Redeploy the frontend, then open Account Security and enroll Email 2FA.

Keep `NEXT_PUBLIC_EMAIL_OTP_ENABLED` unset or `false`; it controls a separate passwordless email sign-in flow and is not needed for the assignment's email second factor. Never expose `RESEND_API_KEY` through a `NEXT_PUBLIC_*` variable. Email 2FA codes are six digits, expire after five minutes, allow five attempts and are stored hashed. Signup email verification remains off even after Resend is configured.

Phone-number verification uses the Better Auth Phone Number plugin with Twilio Verify. The code sends SMS verification requests from the server, checks the code with Twilio, stores the verified phone number on the signed-in member, and makes phone-code sign-in available for verified numbers.

To activate SMS verification in Vercel:

1. Create a Twilio account and a Verify Service in the Twilio Console.
2. In **as-frontend**, add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` as Sensitive environment variables for Production.
3. Add `NEXT_PUBLIC_PHONE_OTP_ENABLED=true` as a Plain environment variable only after all three Twilio values are configured.
4. Redeploy the frontend. Add the variables to Preview and Development as well when testing those environments.

Phone numbers must be entered in international E.164 format, including the leading plus sign and country code (for example, `+8801XXXXXXXXX`). A member signs up with email first, then may verify a phone number on the Phone Verification page. The verified number can then be used for phone-code sign-in. Phone verification remains unavailable until a real Twilio Verify Service and credentials are configured.

Email OTP and phone OTP are separate optional providers. Do not enable either public UI flag before the corresponding server credentials and sending identity are ready.
