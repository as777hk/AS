# Deployment build configuration note

Vercel project `as` is configured to:
- extract `client/.source/client-*.b64` into the `client` root directory,
- pin Node.js to 22.x,
- add `@tailwindcss/postcss` and `tailwindcss` before installing dependencies,
- run `npm run build`.

This build configuration addresses the earlier missing Tailwind PostCSS plugin in the extracted client package. The production deployment still must complete and be checked before the live URL is submitted.
