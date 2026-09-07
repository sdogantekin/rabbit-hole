# RabbitHole (working name)

A mobile app that turns Wikipedia into a Tinder-style swipe deck. Pick a few interest areas, swipe through real Wikipedia article cards, and the app learns what you actually like and gets better at picking your next card. See [`requirements.md`](./requirements.md) for full product scope and [`design.md`](./design.md) for architecture, data model, and the recommendation algorithm — this README is about running and orienting yourself in the code, not the product spec.

## Tech stack

- **Client:** React Native + Expo (managed workflow), TypeScript strict mode, Expo Router (file-based navigation)
- **Styling:** NativeWind (Tailwind for RN) for layout, plain `style` objects for anything colored (React Native has no `oklch()` support — see `constants/theme.ts`)
- **Swipe deck:** custom-built with React Native Reanimated 3 + Gesture Handler (not a third-party swiper library)
- **State:** Zustand for local/UI state, TanStack Query for all server state
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Storage), hosted in `eu-central-1`
- **Content:** Wikimedia REST + Action APIs, proxied through a Supabase Edge Function — the client never calls Wikimedia directly

## Current status

Built and working end-to-end against a real hosted Supabase project:

- **Onboarding:** intro → interest selection (min. 3 of 10 curated categories) → account creation (email OTP or "Continue as guest" via Supabase anonymous auth)
- **Swipe feed:** gesture-based card deck backed by a real Wikipedia crawl-and-cache pipeline, server-side category-weighted recommendation with exploration, tap-to-expand reader view
- **Profile:** streak/XP stats, interest-weight breakdown, liked-articles list, badges computed live from real activity, avatar upload, privacy/consent toggles, edit-interests flow
- **Quiz mode:** unlocks at 5 liked articles, generates short multiple-choice quizzes from your last 10-15 likes via a provider-agnostic LLM adapter (`supabase/functions/_shared/llm/`, Claude Haiku by default), grounded strictly in the source extracts and validated server-side, awards XP on completion

Not yet built: streak/XP scoring for swipes (quiz XP now works, but swiping itself still doesn't increment anything), social sharing, and the `badges`/`user_badges` schema (v2 per `requirements.md`'s iteration plan — the current badges are computed client-side from real data, not stored).

## Prerequisites

- Node.js and npm
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase` or see their docs)
- A Supabase project — either a free hosted project (recommended, no local install) or a local one via `supabase start` (requires Docker)
- The **Expo Go** app on your phone (iOS/Android) — nothing in this app currently needs a custom dev-client build

## Setup

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Set up Supabase:**
   - Create a project at [supabase.com](https://supabase.com) (region `eu-central-1` to match `design.md`), or run `supabase start` locally.
   - Copy `.env.example` to `.env` and fill in your project's URL and **publishable** API key (Project Settings → API → "Publishable and secret API keys").
   - Link this repo to your project and push the schema:
     ```
     supabase login
     supabase link --project-ref <your-project-ref>
     supabase db push
     ```
   - Deploy the Edge Functions (first deploy needs no extra secrets — `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` are auto-injected):
     ```
     supabase functions deploy wiki-proxy get-feed score-swipe
     ```
   - If you want anonymous "Continue as guest" sign-in, enable it in the dashboard (Authentication → Sign In / Providers → Anonymous) or via `supabase config push` after setting `enable_anonymous_sign_ins = true` in `supabase/config.toml`.

3. **Run the app:**
   ```
   npx expo start
   ```
   Scan the QR code with Expo Go. You'll need to be signed into the same Expo account in both the CLI and the Expo Go app (recent Expo Go versions require this to link the dev session).

## Before every commit

```
npm run lint && npm run typecheck
```

## Project structure

```
/app                    Expo Router routes (screens)
  /(onboarding)         intro → interests → auth
  /(tabs)               feed, quiz, profile
  /card/[id]            article reader
  /profile              edit-interests, privacy, liked-articles (pushed from the profile tab)
/components
  /swipe-deck           gesture-based card stack + accessible like/skip buttons
  /card                 article card + its "next card" stack peek
  /interests            reusable interest-selection grid (onboarding + edit-interests)
  /auth                 email OTP form
  /profile              shared row components for the profile screen
  /app-shell            shared header (wordmark + streak/XP badge)
/constants
  interest-categories.ts   curated category list — not auto-generated from raw Wikipedia categories
  theme.ts                 design tokens (colors computed from OKLCh, fonts)
  category-colors.ts, feed.ts, wikipedia-license.ts
/lib
  /localization          t() string lookup — no inline user-facing strings anywhere
  /store                 Zustand: auth, onboarding, feed
  /supabase
    client.ts             Supabase client
    types.ts              hand-written Database types, kept in sync with migrations
    /queries              TanStack Query hooks, one file per concern
  badges.ts               client-computed badge definitions
/supabase
  /migrations             schema, RLS policies, and the two Postgres functions the
                           recommendation algorithm needs (weighted sampling, clamped
                           weight updates) — see the migration files for why they're
                           SQL functions rather than plain queries
  /functions
    wiki-proxy            crawls + caches real Wikipedia articles per curated category
    get-feed              weighted category sampling, triggers wiki-proxy backfill
    score-swipe           idempotent swipe scoring, updates interest weights
    _shared               shared Supabase client helpers for the functions above
```

## Conventions

- TypeScript strict, no `any` without a comment explaining why
- Functional components/hooks only, one component per file
- Server state only via TanStack Query hooks in `/lib/supabase/queries`, never fetched ad hoc in components
- Every user-facing string goes through `t()` in `/lib/localization` — v1 is English-only, but the app shouldn't need a retrofit for a second language
- Non-negotiable guardrails (see `CLAUDE.md` for the full list): visible Wikipedia attribution on every card, no client-side Wikimedia calls, quiz answers must be grounded strictly in given extracts, no default-public leaderboard

## Known environment gap

Local development sandboxes without Docker can't run `supabase start` or `supabase functions serve`. In that case, verification falls back to `npm run typecheck`/`npm run lint`, `npx expo export`, and testing Edge Functions directly against the real hosted project (e.g. via `curl` with a throwaway anonymous session) before testing the full app on a device.
