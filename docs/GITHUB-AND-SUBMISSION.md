# GitHub and assignment submission

## Required links

1. Public client/full-stack repository: https://github.com/samscaleup777/AS
2. Public separate backend repository: https://github.com/samscaleup777/AS-backend
3. Live client website: https://as-kappa-six.vercel.app

## Source code

The frontend source is readable under `client/src/`. The `client/.source/` archive shards are retained for Vercel's deterministic install/extract process. The separate Express backend is readable in the root of `AS-backend`.

## Active Vercel projects

- Frontend: `as-frontend` — https://as-kappa-six.vercel.app
- Backend requested as `AS`: `as` — https://as-two-lac.vercel.app

The obsolete `as-api` project has been removed.

## Examiner demo account

- Email: `examiner@studiospace.demo`
- Password: `StudioSpace!2026`

The Login page includes an examiner autofill control. These are public assessment-demo credentials only.

## GitHub commit requirements

The client repo contains more than 15 substantive frontend code commits. The separate backend repo contains more than 8 substantive backend code commits.

## Google OAuth

The frontend Vercel environment contains `GOOGLE_CLIENT_ID` and Sensitive `GOOGLE_CLIENT_SECRET` for Production, Preview and Development. Google sign-in initiation has returned HTTP 200 and a Google authorization URL with the required callback URI. Complete one real Google consent/callback in a browser before final hand-in.

## Final browser checks

Use the examiner account to test session persistence on private-route refresh, studio CRUD ownership, booking creation/cancellation/host confirmation, overlapping confirmed-booking rejection, wishlist persistence, PDF invoice, theme switching and mobile navigation. Do not represent these user-interactive checks as complete until performed.

Never publish MongoDB URIs, OAuth secrets or other private credentials.