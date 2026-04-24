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

- Git remote is not configured yet.
- GitHub CLI is installed, but auth for `siva73-git` is currently invalid.
- Vercel CLI is available through `npm exec vercel`.
- Vercel CLI is authenticated as `roboticstb-3552`.
- Production and Development env vars were added to Vercel.
- Preview env vars need a connected Git repository before branch-scoped preview values can be added.

## Required Vercel Environment Variables

Add these in Vercel Project Settings for Production, Preview, and Development:

```bash
GRABMAPS_API_KEY
NEXT_PUBLIC_GRABMAPS_API_KEY
GOOGLE_PLACES_API_KEY
```

Do not commit `.env` files. The repo `.gitignore` already excludes `.env*`.

## Suggested GitHub Flow

After GitHub CLI is re-authenticated:

```bash
gh auth login -h github.com
gh repo create siva73-git/grabvision --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` only if the hackathon rules and API-key hygiene are comfortable.

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
