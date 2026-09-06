# design.md — RabbitHole (working name)

Companion to `requirements.md` (what/why) and `CLAUDE.md` (conventions/guardrails). This file covers how it's built: architecture, data model, the recommendation and quiz algorithms, and the visual/UX direction for use with Claude Design.

## 1. System architecture

```
[Expo app] --(auth, reads/writes)--> [Supabase Postgres + Auth]
[Expo app] --(HTTPS)--> [Supabase Edge Function: wiki-proxy] --> [Wikimedia REST API]
[Expo app] --(HTTPS)--> [Supabase Edge Function: generate-quiz] --> [Claude API]
[Swipe event] --> [Supabase Edge Function: score-swipe] --> [updates user_interests weights]
```

The client never talks to Wikimedia or Claude directly. Everything content- or AI-related goes through an Edge Function so caching, rate-limit etiquette, and prompt-grounding rules live in one place instead of being re-implemented per screen.

## 2. Data model (Postgres, via Supabase)

- **profiles** — user_id, display_name, avatar_url, locale, is_premium, streak_count, longest_streak, last_active_date, discovery_score, level
- **interest_categories** — id, slug, label, icon, wikipedia_category_seed (curated, not auto-generated)
- **user_interests** — user_id, category_id, weight (float, this is the core personalization signal)
- **articles_cache** — wikipedia_pageid, title, extract, thumbnail_url, source_url, categories (array), lang, cached_at, ttl_expires_at
- **swipes** — id, user_id, article_pageid, direction (like/skip), category_id, created_at
- **saved_articles** — user_id, article_pageid, saved_at (derived from likes, kept separate for a clean "saved" view)
- **quiz_sessions** — id, user_id, created_at, score, total_questions
- **quiz_questions** — id, quiz_session_id, article_pageid, question_text, options (array), correct_option_index, user_answer_index
- **badges** — id, slug, label, icon, criteria_description
- **user_badges** — user_id, badge_id, earned_at
- **shares** — id, user_id, article_pageid, platform, created_at

## 3. Wikipedia integration

- Use the Wikimedia REST API (`api.wikimedia.org/core/v1/wikipedia/{lang}/page/{title}/summary`) for card content: it already returns a short lead extract plus a thumbnail, so no LLM rewriting is needed for the feed itself.
- Use the search endpoint (`.../search/page?q=...`) for the in-app search/browse feature.
- Category membership isn't exposed cleanly on the newer REST API; pull it via the older Action API (`action=query&list=categorymembers`) inside the `wiki-proxy` function, and treat raw category trees as noisy input that needs the curated `interest_categories` mapping layered on top, not used directly.
- **Rate limits and etiquette:** register a Wikimedia developer account and use a personal API token for the authenticated tier (materially higher hourly limit than anonymous access). Always send a descriptive User-Agent identifying the app and a contact method, per Wikimedia's etiquette expectations. Cache aggressively in `articles_cache` with a multi-week TTL since encyclopedia content doesn't change fast, so the app should rarely need to re-fetch the same article.
- **Attribution (legal requirement, not styling):** every card and every shared image must credit Wikipedia and link to the source article and its CC BY-SA license. Images from Wikimedia Commons often carry separate authorship/licensing and should be checked via the image info metadata rather than assumed to inherit the article's license.
- **Trademark:** don't use "Wikipedia," "Wiki," or Wikimedia's logo in the app's name, icon, or marketing in a way that could imply official affiliation.

## 4. Recommendation algorithm

**v1 — category-weighted sampling (rule-based, no ML infra needed):**
- Onboarding sets initial weight 1.0 on each chosen interest category.
- Like: increase weight on the article's categories by a small delta, capped.
- Skip: decrease weight by a smaller delta, floored above zero so a category never fully disappears (avoids permanently losing a topic a user might warm back up to).
- Next card batch: sample categories proportionally to current weights (weighted random, not strict top-N, to keep the feed feeling varied), then pull unseen cached articles from those categories.
- Reserve roughly 10% of each batch for categories outside the user's current top weights, so the feed keeps surfacing new interests instead of narrowing into a filter bubble. This is a classic exploration-vs-exploitation tradeoff; a simple fixed percentage is enough for v1, no need for a full bandit algorithm yet.

**v2 — embedding-based similarity:** once there's a large enough cached article pool, embed article extracts and score candidates against a centroid of the user's liked-article embeddings (Supabase supports pgvector for this). This moves personalization from coarse categories to actual topic similarity, so liking several articles about black holes can surface general relativity even if it's filed under a different top-level category.

## 5. Quiz generation

- Trigger: user opens Quiz Mode, or the app proactively offers it after a threshold of likes (e.g. every 10).
- Input to the `generate-quiz` Edge Function: the extracts of the last 10-15 liked articles, nothing else.
- Prompt design must explicitly instruct the model to generate questions answerable only from the given extracts and to never introduce outside facts; this is both a product requirement and an engineering guardrail (see `CLAUDE.md`).
- Cache generated quizzes per article-set so retries don't regenerate from scratch, but allow a reshuffle option for variety.

### 5.1 Provider-agnostic LLM layer

This is a structured, short-form generation task (extracts in, JSON quiz questions out), which makes it a reasonable place to swap providers for cost or latency without touching the rest of the app. Design it as an adapter, not a direct SDK call:

```
/supabase/functions/_shared/llm/
  provider.ts             defines LLMProvider interface + a factory that reads
                          an env var (LLM_PROVIDER=anthropic|qwen|deepseek|...)
                          and returns the matching adapter
  anthropic-provider.ts   native Anthropic Messages API call
  openai-compatible-provider.ts
                          generic adapter configured with a base URL + model name +
                          API key; covers Qwen and DeepSeek (and most other
                          cost-competitive providers) since they expose an
                          OpenAI-compatible chat completions endpoint, so one
                          adapter handles all of them via config, not per-provider code
```

- `generate-quiz` calls `LLMProvider.generateQuizQuestions(extracts, count)` and never touches a provider SDK directly, so switching providers is a config change, not a code change.
- Each provider's API key is a separate Supabase secret (`ANTHROPIC_API_KEY`, `QWEN_API_KEY`, `DEEPSEEK_API_KEY`); the factory only reads the one it needs for the active provider.
- Validate every response (regardless of provider) against a strict schema (e.g. zod) for question structure before accepting it. Malformed output is rejected and retried once; a persistent failure falls back to the Anthropic adapter for that request rather than surfacing an error to the user, since availability matters more than which model answered.
- **Cost and performance are not the only switching criteria; grounding fidelity is the one that actually matters for this product.** A cheaper model that occasionally invents a fact outside the source extract is not an acceptable trade for lower cost. Before flipping the default provider in production, run it against a small fixed eval set (a handful of known extract-to-expected-question-quality pairs) and confirm it holds up on "never introduce outside facts" specifically, not just on general answer quality. Keep this eval set checked into the repo so it's easy to re-run whenever a new provider or model version is considered.
- It's fine to run different providers for different use cases later (e.g. a cheaper model for a first-pass draft, Claude for a periodic quality spot-check) but that's a v2+ optimization, not a v1 requirement. v1 just needs the adapter boundary in place so the choice isn't locked into a single vendor's SDK.

## 6. Gamification mechanics

- **Streak:** counts consecutive days with at least one swipe; resets on a missed day (streak protection is a premium feature, not free-tier default).
- **Discovery score / XP:** small amount per swipe, larger amount per correct quiz answer, so quiz performance meaningfully outweighs pure swipe volume.
- **Badges:** tied to real behavior, e.g. a category-mastery badge after N likes in one category, a quiz-accuracy badge after a high-score streak. Avoid badges for trivial actions like "opened the app," which cheapen the whole system.
- **Levels:** derived from cumulative discovery score, mostly cosmetic but gives long-term users something to climb toward.

## 7. Screen-by-screen UX flow

1. **Onboarding:** short value-prop intro, then interest category selection (grid of cards with icon + label), minimum selection enforced before continuing.
2. **Feed (home tab):** full-screen swipe deck. Card shows image, title, extract, category tag, attribution footer. Tap expands to a scrollable reader view with the fuller extract and a link to the full Wikipedia article. Button-based like/skip controls sit below the deck as an accessibility alternative to the gesture.
3. **Quiz tab:** shows quiz availability status ("Quiz ready: 12 articles to draw from"), a start button, then a one-question-at-a-time multiple-choice flow with immediate right/wrong feedback, ending in a score summary and XP awarded.
4. **Profile tab:** streak, discovery score, level, badge case, interest weight breakdown (a simple bar chart per category), saved articles list, settings (edit interests, premium status, privacy/consent controls).
5. **Share flow:** triggered from a card's share button or from the reader view; renders the card as a shareable image via `react-native-view-shot`, opens the native share sheet.

## 8. Visual design direction (for Claude Design)

- **Mood:** calm curiosity rather than dopamine-loop urgency. This app is competing on "makes you smarter," not "makes you doomscroll," and the visual tone should say that even though the interaction pattern (swipe) is borrowed from apps that do the opposite.
- **Card anatomy:** generous image area up top, clear title, 2-3 line extract, small category chip, small attribution line pinned to the bottom edge (never crowded out by content above it).
- **Typography:** a serif or humanist display face for article titles reinforces "encyclopedia," paired with a clean sans-serif for body text and UI chrome.
- **Color:** a restrained palette with one accent color per top-level interest category, used consistently (e.g. science cards always tinted the same accent) so the category becomes visually recognizable before the user even reads the chip.
- **Motion:** the swipe gesture itself should feel physical (spring-based release, slight rotation as the card is dragged) via Reanimated; avoid generic tinder-clone rotation values, tune them so it feels distinct.
- **Quiz mode:** visually calmer and more focused than the feed. No swipe gesture here; it's a deliberate, one-question-at-a-time reading experience.

## 9. Accessibility and localization notes

- All swipe actions need equivalent tap-button controls.
- Sufficient color contrast on category accent colors against both card backgrounds and text.
- Don't hardcode English strings inline; route through a localization layer even in v1 to avoid a painful retrofit for v2's first additional language.
