# requirements.md — RabbitHole (working name)

## 1. Vision

A mobile app where discovering knowledge feels as effortless and habit-forming as swiping through a dating app. You tell it what you're curious about, it pulls real Wikipedia content into a swipeable card feed, learns from what you like and skip, and turns your discoveries into short quizzes so the knowledge actually sticks. Gamification and easy sharing keep people coming back.

## 2. Problem and opportunity

People want to learn things in idle moments (commute, waiting rooms, before bed) but Wikipedia itself is built for lookup, not browsing, and existing "infinite scroll Wikipedia" apps are mostly passive consumption with weak or no personalization. There's an opening for an app that treats swipes as real signal and turns discovery into active recall through quizzes.

## 3. Competitive landscape

Directly comparable apps already exist: **WikiTok**, **WikiUp**, and **WikiScroll** (TikTok-style infinite scroll through Wikipedia), **WikiCards** (basic swipe-to-bookmark, no personalization), and **WanderWiki** (swipeable feed with category browsing, on-device summaries, and share-as-image). None of them ship an adaptive recommendation engine driven by swipe history, and none ship a quiz mode.

**Differentiation for this product:**
- Swipes are training data, not just navigation. Interest weighting adapts per user over time.
- Quiz mode turns liked content into active recall, which is a retention mechanic none of the competitors have.
- Deeper gamification (streaks, discovery score, category-mastery badges) than the "save and share" model competitors use today.

## 4. Target users

- Curious generalists who currently doomscroll social media and would rather that time taught them something
- Trivia/quiz enthusiasts who want a supply of material tailored to what they actually enjoy
- Students or lifelong learners looking for low-friction, bite-sized exploration of a subject before going deeper elsewhere

## 5. Goals and success metrics (v1)

- Day-7 retention comparable to or better than habit-forming content apps in this category (define exact target after soft launch data exists; don't guess a number without a baseline)
- Median swipes per session as a proxy for engagement depth
- Quiz completion rate among users who reach 10+ likes (this is the retention mechanic being bet on, so it needs its own funnel tracking)
- Share rate per active user (proxy for organic growth)
- **Flag for defensibility:** any metric involving "how well personalization worked" (e.g. like-rate trending up over time) needs a clear before/after definition agreed up front, or it will be an easy number to dispute later.

## 6. Functional requirements

### 6.1 Onboarding and interest selection
- User selects one or more interest areas from a curated list (not raw Wikipedia categories, which are too inconsistent in quality and depth)
- Minimum selection required to proceed (e.g. 3) to avoid a cold-start feed that's too broad
- Interest list should be revisitable and editable later from profile settings

### 6.2 Swipe discovery feed
- Card shows: title, image (if available), short extract, category tag, and a visible Wikipedia attribution/link
- Swipe right = like/save, swipe left = skip, tap = expand to a fuller reader view within the app
- Feed must never show the same article twice to the same user (barring an explicit "revisit skipped" feature later)
- Feed should feel instant: pre-fetch and pre-cache the next several cards so swiping never waits on a network call

### 6.3 Personalization / recommendation engine
- Every swipe updates a weight on the article's associated interest categories
- Next batch of cards is sampled proportionally to current category weights, not purely from the original onboarding picks
- A small percentage of cards should always be exploratory (outside current top-weighted categories) so the feed doesn't calcify into a filter bubble
- See `design.md` for the actual algorithm; this section only defines the required behavior

### 6.4 Quiz mode
- Generates short multiple-choice quizzes sourced only from articles the user has liked
- Should be offered proactively at natural checkpoints (e.g. after every N likes), not only when the user seeks it out
- Quiz results should feed back into the discovery score / gamification system
- Questions must be answerable strictly from the source extract; no invented facts (this is also a `CLAUDE.md` guardrail, restated here because it's a product requirement, not just an engineering one)

### 6.5 Gamification
- Daily swipe streak with a visible counter
- Discovery score / XP earned from swipes and quiz performance
- Badges tied to real behavior (e.g. category-mastery badges, quiz-accuracy badges), not arbitrary login streaks alone
- Optional, opt-in leaderboard (must be opt-in given GDPR and the EU user base; do not default users into public comparison)

### 6.6 Social sharing
- One-tap share of a card as a formatted image (not just a text link) for Instagram/WhatsApp/etc.
- Shared image must still carry Wikipedia attribution, since the underlying content requires it regardless of where it's reshared

### 6.7 Profile and stats
- View liked/saved articles
- View interest weight breakdown (transparency into "why am I seeing this") builds trust and is also a differentiator, since none of the competitor apps explain their logic
- Streak, badges, discovery score, quiz history

## 7. Non-functional requirements

- **Performance:** card transitions must stay smooth (60fps target) regardless of network conditions; this is why pre-fetching and local caching matter more here than in a typical CRUD app
- **Offline tolerance:** already-fetched cards should remain swipeable with no connection; queue swipe events and sync when back online
- **Privacy / GDPR:** EU-hosted data, minimal collection, no default-public leaderboard, clear consent for any analytics beyond basic crash reporting
- **Accessibility:** swipe gestures need button-based alternatives (tap targets) for users who can't perform swipe gestures
- **Licensing compliance:** Wikipedia text (CC BY-SA) and Commons images (often separately licensed) both require attribution; this is covered in `design.md`
- **AI vendor flexibility:** quiz generation must not be hard-locked to one LLM vendor's SDK, so the app can move to a cheaper or faster provider as usage scales without a rewrite. Any provider change has to pass a grounding check (no invented facts) before it ships; cost savings never override that (see `design.md` section 5)
- **Localization:** Wikipedia is multi-language; v1 can be English-only, but the data model should not hardcode English in a way that blocks adding languages later

## 8. Iteration plan

**v1 (MVP):** onboarding + interest selection, swipe feed with basic rule-based personalization (category weighting), quiz mode (core differentiator, ships in v1 not deferred), basic gamification (streak + discovery score), share-as-image, English only, Supabase auth (email + one social provider)

**v2:** embedding-based recommendation (move beyond category weighting to article-level similarity), badges/achievements system, additional login providers, offline queueing polish, first non-English language

**v3:** leaderboards (opt-in), premium tier (unlimited quiz mode, streak protection, advanced stats, ad-free if ads are introduced at all), deeper "interest graph" visualization, additional languages

## 9. Out of scope (v1)

- User-generated content or comments
- Editing Wikipedia content from within the app
- Any feature that resembles dating-app matching between users; this app is single-player by design
- Native tablet/desktop layouts (phone-first)

## 10. Open questions (need a decision before or during v1 build)

- Analytics provider: needs to be one with an EU data residency option
- Exact free-tier swipe/quiz limits for the eventual premium tier
- Whether Google/Apple sign-in or email-first is the v1 default
- Success metric baselines (can't be set until there's usage data; don't publish a target number before then)

## 11. Monetization (hypothesis, not committed for v1)

Freemium: free tier is fully usable (unlimited swiping, capped quiz mode), premium (~€4.99/month) unlocks unlimited quiz mode, streak protection, advanced interest-breakdown stats, and any future ad-free guarantee. Revisit after v1 usage data exists rather than optimizing pricing pre-launch.
