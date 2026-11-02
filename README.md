# StudioSpace — Creative Workspace Marketplace

Project starter repository for the B14-A8 StudioSpace assignment.

## Current repository state

The GitHub repository currently contains the initial Next.js configuration and project README. The complete client and Express API source folders are **not yet pushed to this repository**. A complete source package is available in the source archives shared with the project owner in this ChatGPT conversation; extract the package and copy its `AS/client` and `AS/server` folders into this repository before deployment.

## Intended application features

- Three-slide interactive hero, latest six featured studios and five category filters.
- Better Auth email/password registration and login with optional Google OAuth configuration.
- Studio discovery, details gallery, create/update/delete workflows and ownership checks.
- Booking modal with server-side amount calculation, Pending bookings, host status management, cancellation and confirmed-slot collision checks.
- Light/dark theme, wishlist, confirmed-booking PDF invoice, skeleton loading, empty states, toast notifications and custom 404.

## Intended stack

Next.js App Router, React, TypeScript, Better Auth, MongoDB adapter, Express.js, MongoDB, Zod, jose, Swiper, next-themes, Sonner and jsPDF.

## Local setup after source files are copied

1. Use Node.js 22+ and MongoDB Atlas or a local MongoDB database.
2. Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`.
3. Configure MongoDB, Better Auth base URL/secret, Google OAuth credentials and the API URL.
4. In `server/`, run `npm install` then `npm run dev` (port 4000 by default).
5. In `client/`, run `npm install` then `npm run dev` (port 3000 by default).

## Environment and deployment

See `docs/DEPLOYMENT.md` in the full source package. Never commit real credentials. The Vercel project is named `as` and is configured for the `client` root directory. The Express API can be deployed with the included Render blueprint.

## Examiner credentials

After deployment and authentication configuration, create an assessment-only account using `client/scripts/create-examiner.mjs`. The login auto-fill uses the demo email `examiner@studiospace.demo` and password `StudioSpace!2026`; the account must be created before it can be used. Remove or change it after assessment.

## Submission checklist

- Client repository: this repository, after the source folders are copied and pushed.
- Server repository: create a separate public `AS-server` repository and push the contents of `server/`.
- Live website: use the production URL only after Vercel reports the deployment as READY.

The current linked GitHub integration can update repository files but does not provide repository creation or a local-directory Git push action.