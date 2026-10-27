## ShowLog

**ShowLog** is a social TV tracking + discovery app with a “social feed” feel: log shows, track watch status, rate shows, explore tags, follow users, and browse profiles with stats/visualizations.

## Features

- **Auth & accounts (Supabase Auth)**: sign up, login, email callback flow, reset/update password pages.
- **Watchlist + logging**: track shows by status (watchlist, catching up, rewatching, etc.) and keep progress up to date.
- **Show pages**: show details, ratings + status counts, tags/categories, cast/actors, similar show recommendations.
- **Profiles**: user pages, following/followers, lists, stats (including tag/service breakdowns and charts).
- **Images**:
  - Show images + profile pictures stored in **Cloudflare R2**, served straight from `assets.showlog.tv` / `avatars.showlog.tv`.
- **Modern UI**: App Router, React 19, Tailwind, Radix/shadcn UI components, charts.

## Tech stack

- **Next.js (App Router)**: UI and routing live under `app/` (with some legacy `/pages/api` API routes for file handling).
- **Supabase**: Auth + Postgres data (tables/views/RPC).
- **Storage**: Cloudflare R2 for images.
- **Caching**: uses Next.js `useCache` (`'use cache'`) + `cacheLife()` and React `cache()` to reduce repeated Supabase calls.

## High-level architecture

### Routing and UI organization

- **App Router routes** live in `app/`.
  - `app/(main)/...` contains the main authenticated app routes (shows, profile, lists, search, etc.).
  - `app/components/...` contains shared UI components and page-level composition components.
- **Pages Router API routes** live in `pages/api/` (used where raw Node APIs are needed for multipart uploads and binary streaming).

### Data access pattern (“Service” modules)

Most routes/components delegate data fetching into `*Service.ts(x)` modules (for example `app/components/home/HomeService.tsx`, `app/(main)/show/[showId]/ShowService.tsx`, `app/utils/userService.ts`).

Common traits:

- **Server-side Supabase access** via `app/utils/supabase/server.ts`
  - `publicClient()` uses the anon key for public reads (views, counts, etc.).
  - `createClient()` creates a cookie-aware Supabase server client. Sessions are Better Auth's now, so it reads as anonymous; only the `useBackendService = false` fallbacks use it.
- **Client-side Supabase access** via `app/utils/supabase/client.ts` for browser interactions.
- **Caching**: many fetchers use `cache()` + `'use cache'`/`cacheLife()` to avoid re-fetching stable data.

### Auth flow

Sign-in is [Better Auth](https://better-auth.com), self-hosted on the ShowLog API Worker under
`https://api.showlog.tv/api/auth` (`ShowLog_API/src/betterAuth.ts`). Google and Apple are the only
providers; there are no passwords.

- **Sign-in** (`app/(main)/login`): `SocialSignInClient` calls Better Auth from the browser
  (`app/utils/auth/authClient.ts`), the provider redirects back through the API, and the API sets
  the session cookie on `.showlog.tv` before landing on `/auth/finish`.
- **First sign-in**: `/auth/finish` sends anyone without a profile to `/signup` to pick a username
  (`createProfile` in `app/utils/auth/accountActions.ts` → `POST /account`).
- **Server side** (`app/utils/auth/server.ts`): `getCurrentUserId()` and `getAccessToken()` forward
  the session cookie to `GET /api/auth/token` for a 15-minute API access token, reused across
  requests until shortly before it expires. They read cookies, so keep them out of `'use cache'`.
- **Route protection**: `proxy.ts` redirects to `/login` when the session cookie is missing.
- **Local development**: run `ShowLog_API` with `wrangler dev` and set
  `NEXT_PUBLIC_SHOWLOG_API_URL=http://localhost:8787`.

### Images and media

Images are stored in **Cloudflare R2** and served directly from custom domains, cached at the edge with `Cache-Control: immutable`:

| Bucket | Public domain | Keys |
|---|---|---|
| `showlog-images` | `https://assets.showlog.tv` | `shows/{uuid}.jpeg`, `shows/{uuid}_200x200.jpeg`, `shows/{uuid}_640x640.jpeg` |
| `showlog-profile-pics` | `https://avatars.showlog.tv` | `{uuid}.jpeg` (`blank.jpeg` is the default avatar) |

`show.pictureUrl` and `user.profilePhotoURL` store the bare UUID. The iOS app builds the same URLs, so the key layout is shared between both clients.

- **URLs**: `app/utils/imageUrls.ts` (`getShowImageUrl`, `getProfilePicUrl`). No signing or proxying is needed.
- **Upload (authenticated)**: `pages/api/imageUploader.ts`
  - Accepts a multipart upload (Formidable) with `type` = `show` or `profile`, converts to JPEG (Sharp), writes to R2 via `app/utils/r2.ts`, and returns a new `imageId` that the client saves to the DB.
  - Show uploads also generate the 200x200 and 640x640 variants.
- **Average color**: `app/actions/imageActions.ts` fetches the 200x200 variant from the CDN and computes a 1x1 resize.

### “Environment-aware” base URLs

`app/envConfig.tsx` centralizes how the app chooses a base URL in local vs production. Some services build API URLs using this.

## Project structure (guide)

- **Routes**: `app/(main)/...`
  - `show/[showId]/...`: show pages and related services
  - `profile/[username]/...`: profiles + stats
  - `list/[listId]/...`: lists
  - `search/`, `discoverShows/`, `watchlist/`, `login/`, `signup/` (username step), `auth/finish/`
- **UI components**: `app/components/...` and `components/ui/...` (shadcn/Radix)
- **Domain models**: `app/models/...` (typed DTOs)
- **Supabase helpers**: `app/utils/supabase/...`
- **API routes**: `pages/api/...` (uploads, image fetch, signed URLs)

## Running locally

### Prereqs

- Node.js + npm
- A Supabase project (Auth + Postgres)
- A Google Cloud Storage bucket (or configure/disable image features)

### Install & run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Environment variables

Create `.env.local` (not committed) and configure at least:

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (used by the cookie-aware server client in `app/utils/supabase/server.ts`)

### Cloudflare R2 (image uploads)

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY` (from an R2 API token with Object Read & Write on both buckets)

Reads need no credentials; the buckets are public through their custom domains.

## Deployment notes

- **Vercel** is the intended deployment target.
- `next.config.js` allows remote images from Vercel-hosted domains, the R2 image domains (`assets.showlog.tv`, `avatars.showlog.tv`), and `localhost`.

## Contributing / maintenance

- “Service” modules are the preferred place to add/adjust Supabase queries so components stay focused on rendering.
