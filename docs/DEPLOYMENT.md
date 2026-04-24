# Deployment and Mobile Demo

Last updated: 2026-04-24

## Current Target

- GitHub profile: `siva73-git`
- Vercel account email: `siva73@gmail.com`
- Primary demo target: laptop browser
- Secondary demo target: iPhone 13 Pro Max over HTTPS

## Deployment Status

The app is deployed to Vercel production:

- Production alias: `https://grabvision.vercel.app`
- Deployment URL: `https://grabvision-dtsh34rs0-roboticstb-3552s-projects.vercel.app`
- Vercel project: `roboticstb-3552s-projects/grabvision`

The app is also locally deploy-ready:

```bash
npm run lint
npm run typecheck
npm run build
```

Known local status:

- GitHub repo is configured and pushed: `https://github.com/siva73-git/grabvision`
- Vercel CLI is available through `npm exec vercel`.
- Vercel CLI is authenticated as `roboticstb-3552`.
- Production and Development env vars were added to Vercel.
- Vercel Git connection is active for `https://github.com/siva73-git/grabvision`.
- Preview env vars are not yet added. Vercel CLI is still returning `git_branch_required` in non-interactive mode for all-preview variables, and rejects `main` because it is the Production branch. Add Preview variables in the Vercel dashboard if preview deployments are needed before branch-specific CLI setup is available.

## Required Vercel Environment Variables

Add these in Vercel Project Settings for Production, Preview, and Development:

```bash
GRABMAPS_API_KEY
NEXT_PUBLIC_GRABMAPS_API_KEY
GOOGLE_PLACES_API_KEY
```

Do not commit `.env` files. The repo `.gitignore` already excludes `.env*`.

## Suggested GitHub Flow

Current remote:

```bash
git remote -v
# origin  https://github.com/siva73-git/grabvision.git
```

The repo was created as private. To recreate this manually:

```bash
gh auth login -h github.com
gh repo create siva73-git/grabvision --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` only if the hackathon rules and API-key hygiene are comfortable.

## Vercel Git Connection

The local Vercel project is linked and connected to GitHub:

```bash
npm exec vercel -- git connect https://github.com/siva73-git/grabvision.git
```

Production and Development env vars are already set. If Preview deployments are needed, add these through the Vercel dashboard for the Preview environment:

```bash
GRABMAPS_API_KEY
NEXT_PUBLIC_GRABMAPS_API_KEY
GOOGLE_PLACES_API_KEY
```

## Suggested Vercel Flow

Recommended path:

1. Push to GitHub.
2. Import the GitHub repo in Vercel under the correct account/team.
3. Add the environment variables in Vercel.
4. Deploy from Vercel.
5. Open the HTTPS deployment on laptop and iPhone.

CLI path, after confirming Vercel auth:

```bash
npm exec vercel -- link
npm exec vercel -- env add GRABMAPS_API_KEY
npm exec vercel -- env add NEXT_PUBLIC_GRABMAPS_API_KEY
npm exec vercel -- env add GOOGLE_PLACES_API_KEY
npm exec vercel -- deploy --prod
```

Current production deploy command:

```bash
npm exec vercel -- deploy --prod --yes
```

## iPhone Demo Checklist

Use the deployed HTTPS URL, not plain `localhost`.

- Open in Safari on iPhone 13 Pro Max.
- Confirm the header avoids the notch.
- Confirm the story card bottom avoids the home indicator.
- Confirm the GrabMaps panel loads.
- Tap `Route` and confirm the route remains usable if live providers fallback.
- Tap the play button and confirm the preview advances cards/map.
- Add to Home Screen and confirm the GrabVision icon appears.

## Known Mobile Caveats

- `navigator.vibrate` is not reliable on iOS Safari.
- Compass/sun orientation still needs a dedicated implementation pass.
- If Vercel env vars are missing, the app shell still loads but GrabMaps style and live provider APIs will fail.
