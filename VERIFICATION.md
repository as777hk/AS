# StudioSpace verification record

## Confirmed source, deployment and database

- The public frontend/full-stack repository is https://github.com/samscaleup777/AS.
- The public, separate Express backend repository is https://github.com/samscaleup777/AS-backend.
- The frontend repo exposes readable application source below `client/src/`; Vercel reconstructs the complete frontend from `client/.source/` archive shards and then applies `client/patch-auth.mjs` before installing and building. The patch script is the authoritative place for build-time homepage, brand and upload customisations.
- The frontend repository has at least 100 recent commits available through the GitHub API; the separate backend repository has 38 commits. Both exceed the assignment minimums of 15 client and 8 server commits. Feature history includes booking availability, wishlist persistence, studio CRUD, authentication, validation, responsive UI, accessible dialogs, the new visual identity and image-upload route.
- MongoDB Atlas cluster `AnnikaCluster`, database `studiospace`.
- Dedicated Atlas API user `studiospace_api` has only `readWrite` access to the `studiospace` database. Its URI is stored as a Sensitive Vercel environment value.
- Six illustrative demo studio documents exist in the `studios` collection, all marked as demo data and assigned to `examiner@studiospace.demo`. Current Atlas counts: 6 studios, 6 users, 7 accounts, 3 two-factor records, 1 wishlist, 0 bookings and 0 reviews.
- The examiner user exists in Better Auth's `user` collection. The examiner user exists in Better Auth's `user` collection; the current counts are listed above.

## Vercel projects

- Frontend: Vercel project `as-frontend`, Next.js, Node 22, GitHub repo `samscaleup777/AS`, stable URL https://as-kappa-six.vercel.app.
- Backend: Vercel project `as`, Express, Node 22, GitHub repo `samscaleup777/AS-backend`, stable URL https://as-two-lac.vercel.app.
- The obsolete Vercel `as-api` project is no longer present. The project list contains only `as` and `as-frontend`.
- The production alias `https://as-kappa-six.vercel.app` maps to frontend deployment `dpl_FNWWcXRt5LcTBZoS59bo9LiJeCb4` at commit `64549d7328a58a3f01855c458715282a5dd770af`, state `READY`. A later duplicate production attempt was `CANCELED` but did not replace the alias. Vercel's completed frontend build reported TypeScript success and 28/28 static pages generated. The latest backend production deployment `dpl_GCGQ942NT2BtRUZXj2HG6CsVa69t` is `READY` at commit `e3de09669df107d1358e94281c6e9a6e3eaae598`.
- Backend production build is `READY`.

## Previously recorded endpoint checks (not a substitute for current browser testing)

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

## Current items still requiring manual verification

1. Configure Resend: set a verified sender identity as `AUTH_FROM_EMAIL`, confirm the Sensitive `RESEND_API_KEY` is valid, and set `EMAIL_2FA_ENABLED=true` only after both sender settings are ready. `AUTH_FROM_EMAIL` is currently missing from Vercel, and runtime logs show previous email-code delivery failures. Signup email verification must remain disabled.
2. Open the live Login page and complete Google consent/callback with an account allowed by the Google OAuth consent screen. Google OAuth initiation was previously checked, but the complete browser callback is not yet verified.
3. Sign in with the examiner account, check the HTTPOnly `better_auth_jwt` cookie, and refresh `/my-listings` and `/my-bookings` while signed in.
4. Add, edit and delete a studio; verify another account cannot edit the examiner's listing.
5. Create a booking, cancel a Pending request, then confirm one as host; submit an overlapping confirmed interval and verify it is rejected.
6. Save/unsave a studio, refresh the saved page and download a confirmed-booking PDF invoice.
7. Test Light/Dark mode, the mobile navigation, category filters, homepage hash links and image rendering on a phone-sized viewport.\n8. Add a real `IMGBB_API_KEY` to the frontend Vercel project and test an authenticated file upload. Hosted image URLs remain usable until the key is configured.

## Honest feature boundaries

- Studio photos can be supplied by URL or uploaded through the authenticated Next.js `/api/upload` route, which forwards files to ImgBB server-side. The route is implemented, but `IMGBB_API_KEY` is not present in Vercel yet, so local-file uploads will remain disabled until the user adds that secret.
- Host information is account-linked, but the app does not run independent background checks.
- Liability/coverage guidance and equipment safety information are shown; the platform does not itself provide insurance or liability coverage.
- Booking records and self-service pages are available online at any time. The app does not claim to operate a staffed 24/7 human support desk.

Do not describe the Google callback or authenticated browser journey as tested until the manual checks above have actually been completed.