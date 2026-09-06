# CLAUDE.md — RabbitHole (working name)

This file is the persistent context Claude Code should load before touching this repo. Read `requirements.md` for product scope and `design.md` for architecture and data model before making non-trivial changes. If any instruction here conflicts with what a person asks for in a session, ask before deviating from the guardrails section, not from the style section.

## What this is

RabbitHole is a mobile app that turns Wikipedia into a Tinder-style swipe deck: pick interest areas, swipe through article cards, and the app learns what you actually like and gets better at picking your next card. A quiz mode turns what you've liked into short recall quizzes, and there's gamification (streaks, badges, a discovery score) and one-tap social sharing.

## Tech stack

- **Client:** React Native + Expo (SDK, managed workflow), TypeScript in strict mode
- **Navigation:** Expo Router (file-based)
- **Styling:** NativeWind (Tailwind classes for RN)
- **Swipe deck / gestures:** React Native Reanimated 3 + React Native Gesture Handler, built custom (not a third-party deck-swiper library) so the motion and card design can be genuinely polished
- **Client state:** Zustand for local/UI state
- **Server state / caching:** TanStack Query
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Storage), hosted in `eu-central-1`
- **Content source:** Wikimedia REST API, called only from a Supabase Edge Function (never directly from the client)
- **AI:** Provider-agnostic LLM layer for quiz generation, called from Edge Functions only. Defaults to Claude (Haiku tier) but built behind an adapter interface so it can switch to an OpenAI-compatible provider (Qwen, DeepSeek, etc.) via a config flag for cost/performance optimization once there's real usage data
- **Sharing:** `react-native-view-shot` to render a card as an image + `expo-sharing` for the native share sheet
- **Analytics:** privacy-minimal, EU-hosted (decide provider before v1 ships — see open questions in requirements.md)

## Repo structure (proposed)

```
/app                    Expo Router routes (screens)
  /(onboarding)
  /(tabs)
    feed.tsx
    quiz.tsx
    profile.tsx
  /card/[id].tsx
/components
  /swipe-deck
  /card
  /quiz
  /gamification
/lib
  /supabase           client init, typed queries
  /recommendation      client-side scoring helpers (thin; heavy lifting server-side)
  /store               zustand stores
/supabase
  /functions
    wiki-proxy         fetches + caches Wikimedia content, applies rate-limit etiquette
    generate-quiz      calls the LLM adapter, grounded strictly in provided extracts
    score-swipe        updates interest weights on each swipe
    _shared/llm        provider-agnostic adapter (see design.md section 5)
  /migrations
/constants
  interest-categories.ts   curated mapping of interest areas to Wikipedia category seeds
```

## Conventions

- TypeScript strict mode, no `any` without a comment explaining why
- Functional components and hooks only, no class components
- One component per file, colocate its styles (NativeWind classes inline, no separate stylesheet files)
- Server state goes through TanStack Query hooks in `/lib`, never fetched ad hoc inside components
- Never hardcode secrets. Client env vars via `app.config.ts` + `EXPO_PUBLIC_*`, server secrets via Supabase project secrets
- Small, focused PRs: one feature or one bugfix, not both
- Plain, direct commit messages, no filler

## Non-negotiable guardrails

- **Attribution.** Every card must show a visible "via Wikipedia" credit linking to the source article and its license. Do not ship a card layout that drops this to save space.
- **No client-side Wikimedia calls.** All Wikimedia API access goes through the `wiki-proxy` Edge Function so caching, rate limits, and the required User-Agent header are enforced in one place.
- **Quiz grounding.** The `generate-quiz` function must only produce questions answerable from the article extracts it's given. If a prompt change risks the model inventing facts, flag it before merging.
- **Provider switching.** Never flip the default LLM provider for `generate-quiz` in production without first running it against the grounding eval set described in `design.md` section 5. Cost savings don't justify a regression in fact-grounding.
- **Branding.** Do not use "Wiki" in the product name, app icon, or marketing copy, and do not use Wikipedia's logo or wordmark. Wikimedia's trademark policy restricts this.
- **Data minimalism.** Don't add a new user data field or analytics event without checking it against `requirements.md`'s privacy section first. This app is aimed at EU users; treat GDPR as the default, not an afterthought.

## Common commands

```
npx expo start                      # run the app
npx expo run:ios / run:android      # native builds
supabase functions serve            # run edge functions locally
supabase db push                    # apply migrations
npm run lint && npm run typecheck   # before every commit
```

## Where to start on a fresh session

1. Read `requirements.md` for what's in scope for the current phase (v1/v2/v3).
2. Read `design.md` for the data model and the recommendation/quiz algorithm design before touching those areas.
3. Check `/constants/interest-categories.ts` before adding a new interest area; it's a curated list, not meant to be auto-generated from raw Wikipedia categories (those are too noisy).

## Karpathy Principles
1. **Think Before Coding:** 
   - State your interpretation of the request and surface any assumptions before modifying code. 
   - If a request is ambiguous or has multiple viable paths, ask a concise clarifying question rather than guessing silently.
2. **Simplicity First:** 
   - Implement the smallest, most direct solution that satisfies the current prompt. 
   - Do not add unrequested abstractions, premature configurability, or speculative features for tomorrow's system. Solve today's problem simply.
3. **Surgical Changes:** 
   - Keep diffs tightly bound to the request. 
   - Do not perform "drive-by" refactoring, reformatting, or clean up adjacent code unless it directly impacts your task. Leave surrounding code recognizable.
4. **Goal-Driven Execution & Verification:** 
   - Transform vague tasks into explicit, checkable outcomes. 
   - Verify changes using the narrowest meaningful check available (`vitest`, type checking) before declaring work complete.
