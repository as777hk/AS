# GitHub and assignment submission

## Required assignment links

1. Public client/full-stack repository: https://github.com/samscaleup777/AS
2. Public backend repository: create `AS-server` as a separate public repository and publish the extracted `server/` folder.
3. Live client website: use the Vercel production URL only after the project deployment is `READY`.

## Current publishing mechanism

The connected GitHub integration can write blobs, trees, commits and refs to existing repositories, but does not expose a repository-creation action or a direct local-folder push action. The full application is therefore included in source bundles under `client/.source` and `server/.source`; deployment commands unpack each bundle into readable source before installing dependencies.

Create the separate public API repository at https://github.com/new?name=AS-server&visibility=public, then copy the extracted `server/` application into it.

## Git commit requirements

The assignment requires at least 15 meaningful client commits and 8 meaningful server commits. Do not pad the history with empty or fabricated commits. Commit actual feature groups and record their pushed history in the corresponding repositories. The archive publication commit is not a substitute for the required feature-by-feature history.

## README checklist

The client and server READMEs must state the app name, deployed URL, five or more real features, technology stack, local setup commands and examiner test instructions. Replace placeholder live URLs only after deployment succeeds.
