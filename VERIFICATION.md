# StudioSpace verification record

## Verified in this session

- Client source archive SHA-1 chunk comparison: source pieces are checked against the Git blob IDs before publishing.
- Server source archive SHA-1 chunk comparison: source pieces are checked against the Git blob IDs before publishing.
- Booking rules: 4/4 isolated unit tests passed (date validation, time validation, overlap, amount/duration).
- MongoDB Atlas: dedicated `studiospace` DB user with `readWrite` on the `studiospace` database created; collections `studios`, `bookings`, `bookingLocks`, `wishlists`, `newsletters`, and `reviews` created.
- Vercel project: project `as` inspected; Node.js 22, Next.js and root directory `client` configured.
- Vercel environment variables: sensitive Better Auth secret and MongoDB URI set; database name and examiner auto-fill settings set.

## Not yet verified

- Full `npm install` (registry requests timed out in this runtime), Next.js `next build`, full Express TypeScript build and browser end-to-end tests.
- Google OAuth: no Google OAuth client ID/secret has been provided/configured.
- Express API deployment to Render and its public URL.
- Vercel production deployment and stable production URL.
- `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `API_SERVER_URL`, backend `AUTH_BASE_URL` and `CLIENT_ORIGIN` need final live URLs.
- Examiner user creation: the auto-fill values are configured, but the user must be created after the public frontend and backend are live.
- Separate public `AS-server` GitHub repository: the connected GitHub actions in this session do not expose repository creation.
- 15 frontend and 8 backend meaningful commits have not yet been confirmed in public remotes.

Do not describe this project as production-tested, fully deployed, or assignment-ready until these checks pass.
