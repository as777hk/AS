# GitHub and assignment submission

## Required links

1. Public client/full-stack repository: https://github.com/samscaleup777/AS
2. Public separate backend repository: https://github.com/samscaleup777/AS-backend
3. Live client website: https://as-kappa-six.vercel.app

## Vercel projects

- Frontend: `as-frontend` — https://as-kappa-six.vercel.app
- Backend project requested as `AS`: `as` — https://as-two-lac.vercel.app

The backend root endpoint returns an online status object and lists its main API routes. The unused older `as-api` project is separate and can be deleted from Vercel project settings.

## Examiner account

- Email: `examiner@studiospace.demo`
- Password: `StudioSpace!2026`

This is a public assessment-demo account. The Login page also includes an examiner auto-fill control.

## Commit requirements

The client repository currently has 53 commits. Nineteen recent frontend commits contain code changes for image performance, saved-state accessibility, studio search/filter accessibility, registration and listing validation, accessible booking dialogs, cancellation/deletion confirmations, newsletter validation and status announcements.

The separate backend repository currently has 25 commits, including API root/health, database, JWT authentication, studio CRUD/availability, booking lifecycle and collision rules, wishlist, newsletter and tests.

## Remaining setup

Google OAuth still needs a Web OAuth Client ID and Client Secret configured in the Vercel `as-frontend` project. Complete a real browser test of the examiner login, HTTPOnly JWT cookie, protected CRUD and booking workflows before final hand-in.

Never commit Atlas URIs, OAuth secrets or private production credentials.