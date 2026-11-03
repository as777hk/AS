# StudioSpace verification record

## Confirmed source, deployment and database

- The public frontend/full-stack repository is https://github.com/samscaleup777/AS.
- The public, separate Express backend repository is https://github.com/samscaleup777/AS-backend.
- The frontend repo exposes readable application source below `client/src/`; Vercel reconstructs the complete frontend from `client/.source/` archive shards and then applies `client/patch-auth.mjs` before installing and building. The patch script is the authoritative place for build-time homepage, brand and upload customisations.
- The frontend has 79 commits and the backend has 26 commits, exceeding the assignment minimums of 15 client and 8 server commits. Feature history includes booking availability, wishlist persistence, studio CRUD, authentication, validation, responsive UI, accessible dialogs, the new visual identity and image-upload route.
- MongoDB Atlas cluster `AnnikaCluster`, database `studiospace`.
- Dedicated Atlas API user `studiospace_api` has only `readWrite` access to the `studiospace` database. Its URI is stored as a Sensitive Vercel environment value.
- Six illustrative demo studio documents exist in the `studios` collection, assigned to `examiner@studiospace.demo`.
- The examiner user exists in Better Auth's `user` collection. At last count the database had 6 studios, 1 matching examiner user, 0 bookings and 0 wishlists.

## Vercel projects

- Frontend: Vercel project `as-frontend`, Next.js, Node 22, GitHub repo `samscaleup777/AS`, stable URL https://as-kappa-six.vercel.app.
- Backend: Vercel project `as`, Express, Node 22, GitHub repo `samscaleup777/AS-backend`, stable URL https://as-two-lac.vercel.app.
- The obsolete Vercel `as-api` project is no longer present. The project list contains only `as` and `as-frontend`.
- The brand-refresh frontend build for commit `93878749db1a49264816b5b160a8b4933a13cef5` compiled successfully; TypeScript passed and the production deployment reached `READY`. The new route `/api/upload` is present in the production route list. README, logo asset and brand-guide commits are queued for a follow-up deployment.
- Backend production build is `READY`.

## Live endpoint checks

- `GET https://as-two-lac.vercel.app/`: HTTP 200; returns StudioSpace API name, online status and endpoint directory.
- `GET /health`: HTTP 200.
- `GET /api/studios/featured`: HTTP 200 with six records.
- `GET /api/studios/:id/availability?date=YYYY-MM-DD`: HTTP 200 with confirmed occupied windows; invalid calendar dates return HTTP 400.
- `GET https://as-kappa-six.vercel.app/`, `/terms`, `/login`, `/register`, studio details and other public/private page shells: HTTP 200 on direct route fetch; unknown page: HTTP 404.
- Frontend proxy `/api/server/studios/featured`: HTTP 200 with six records.
- Better Auth `/api/auth/jwks`: HTTP 200; logged-out `/api/auth/get-session`: HTTP 200 with null session.
- Unauthenticated `/api/bookings/me`, `/api/bookings/host` and `/api/wishlist` return HTTP 401, as expected.
- Google OAuth initiation `POST /api/auth/sign-in/social` for provider `google` returned HTTP 200, created an authorization URL on `accounts.google.com`, and set the secure OAuth state cookie. Its redirect URI was `https://as-kappa-six.vercel.app/api/auth/callback/google`. This confirms the provider configuration is loaded, but the full Google consent/callback still needs a real browser sign-in.

## Local test results

- Frontend clean-source production build: compiled successfully; TypeScript passed; 13/13 static pages generated.
- Frontend ESLint: 0 errors, 7 non-blocking `@next/next/no-img-element` warnings for dynamically supplied/remote images.
- Backend `npm test`: TypeScript compilation passed; 4/4 booking-rule tests passed (date, time window, interval overlap and total calculation).
- Production dependency audit after jsPDF upgrade to 4.2.1: 0 production vulnerabilities. Full audit has 16 moderate findings in development-only ESLint tooling; no high or critical findings.
- Latest runtime error history contains old events from earlier deployments: the Better Auth `sessionCookieCache` configuration error and one old OAuth `State not found` event. The current source removes the invalid session-cookie-cache option, current Google initiation succeeds, and the latest clean production build is READY. Do not treat historical events as a current live error.

## Still requires a human browser pass

1. Open the live Login page and complete Google consent/callback with a Google account allowed by the OAuth consent screen.
2. Sign in with the examiner email/password and check the HTTPOnly `better_auth_jwt` cookie is issued.
3. Refresh `/my-listings` and `/my-bookings` while signed in.
4. Add, edit and delete a studio; verify another account cannot edit the examiner's listing.
5. Create a booking, cancel a Pending request, then confirm one as host; submit an overlapping confirmed interval and verify it is rejected.
6. Save/unsave a studio, refresh the saved page and download a confirmed-booking PDF invoice.
7. Test Light/Dark mode, the mobile navigation, category filters, homepage hash links and image rendering on a phone-sized viewport.

## Honest feature boundaries

- Studio photos can be supplied by URL or uploaded through the authenticated Next.js `/api/upload` route, which forwards files to ImgBB server-side. The route is implemented, but `IMGBB_API_KEY` is not present in Vercel yet, so local-file uploads will remain disabled until the user adds that secret.
- Host information is account-linked, but the app does not run independent background checks.
- Liability/coverage guidance and equipment safety information are shown; the platform does not itself provide insurance or liability coverage.
- Booking records and self-service pages are available online at any time. The app does not claim to operate a staffed 24/7 human support desk.

Do not describe the Google callback or authenticated browser journey as tested until the manual checks above have actually been completed.