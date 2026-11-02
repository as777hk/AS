# StudioSpace — Client Application

A unique, responsive creative-studio marketplace built with Next.js App Router, React, TypeScript and Tailwind CSS. The client connects to the companion Express API through a same-origin Next.js rewrite so the API's HTTPOnly JWT cookie remains first-party in the browser.

## Live website

`https://YOUR-CLIENT-APP.vercel.app` — replace this with the deployed client URL before submitting the assignment.

## Features

- Three-slide interactive hero, dynamic six-studio feature section and five category deep links.
- Studio discovery with search, category, price and sort filters.
- Studio detail gallery, amenities, host information, reviews and booking modal.
- Better Auth email/password and Google login, protected route redirect preservation and test-account auto-fill.
- Host listing create/update/delete forms with read-only host information and ImgBB upload support.
- Creator bookings and host management, Pending/Confirmed/Completed/Cancelled states and cancellation modal.
- Global Light/Dark theme toggle, saved studio wishlist, confirmed-booking PDF invoice.
- Branded loading, empty and custom not-found states with toast feedback.

## Run locally

Copy `.env.example` to `.env.local`, then run:

```bash
npm install
npm run dev
```

Client URL: `http://localhost:3000`. The Express API must be running separately on `http://localhost:5000` (see the companion server package in the supplied project bundle).

Set the real deployment URL in `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`, the server's `AUTH_BASE_URL`/`AUTH_ISSUER`/`AUTH_AUDIENCE`, and Google OAuth callback configuration. See `docs/deploy.md` in the supplied project bundle.

## Examiner test credentials

Create a dedicated examiner account through the Register page after MongoDB is configured. Set `NEXT_PUBLIC_EXAMINER_EMAIL` and `NEXT_PUBLIC_EXAMINER_PASSWORD` to that assessment-only account in the Vercel build environment. The login page includes an auto-fill button that reads those public environment variables. Do not expose a personal account password.

**Submission reminder:** Add the actual live URL and actual examiner-only credentials before sending this repository to the instructor.
