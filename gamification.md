# Gamification spec — XP, streaks, levels, badges, quizzes, sharing, leaderboards

This document is the single place that defines how RabbitHole's engagement mechanics work:
the rules, the numbers, the flows, and the decisions still open. `requirements.md` §6.4–6.5
says *what* we want at a high level and `design.md` §6 gives four bullet points of intent;
this is the detailed layer underneath both. When the two disagree, this document wins for
gamification specifics.

Each section has two parts:

- **As built** — what the code does today, with file references. This is verified against the
  implementation, not aspirational.
- **Open decisions** — things that are unspecified, inconsistent, or that we should
  consciously choose. Each has a recommendation; none are implemented until decided.

Section 9 collects every open decision in one numbered list.

---

## 1. The pieces and where they live

| Mechanic | State | Where it's stored | Who writes it |
|---|---|---|---|
| Discovery score (XP) | one integer per user | `profiles.discovery_score` | `score-swipe`, `complete-quiz`, `complete-shared-quiz` (all Edge Functions) |
| Streak | current + longest + last active day | `profiles.streak_count`, `longest_streak`, `last_active_date` | `score-swipe` via `record_swipe_activity()` |
| Level | derived, not stored | computed in `app/(tabs)/profile.tsx` | nobody — pure function of XP |
| Badges | derived, not stored | computed live in `lib/badges.ts` from likes/streak/XP/last quiz | nobody — recomputed on every profile render |
| Quiz sessions + answers | one row per quiz, one per question | `quiz_sessions`, `quiz_questions` | `generate-quiz`, `complete-quiz` |
| Shared quizzes + plays | one share per completed quiz, one play per (share, player) | `shared_quizzes`, `quiz_plays` | `share-quiz`, `complete-shared-quiz` |
| Leaderboard opt-in | boolean, default off | `profiles.leaderboard_opt_in` | user, from Privacy & consent screen |

Two things worth internalizing from this table:

1. **XP is the only real currency.** Streak, level, and badges are all either derived from
   it or sit beside it; nothing is ever spent.
2. **Levels and badges have no memory.** They're recalculated from raw data each time. That
   keeps them honest (they can never drift from reality) but it also means the app can't
   currently say "you just earned a badge" — it doesn't know it was ever *not* earned.

---

## 2. XP (discovery score)

### As built

| Action | XP | Where |
|---|---|---|
| Any swipe (like **or** skip) | **+1** | `score-swipe/index.ts` → `SWIPE_XP = 1` |
| Each correct answer in your own quiz | **+15** | `complete-quiz` → `QUIZ_XP_PER_CORRECT_ANSWER` in `constants/quiz.ts` |
| Each correct answer playing someone's shared quiz | **+15** | `complete-shared-quiz`, same constant |
| Sharing a quiz | 0 | — |
| Streak milestones, badges, levels | 0 | — |

Rules the code enforces:

- **Server-side only.** The client never sends a score or an XP amount. Quizzes are
  regraded from the stored answer key; swipes are counted as they arrive. There is no way
  for a modified client to award itself XP.
- **Idempotent.** Completing the same quiz twice, or replaying a shared quiz, returns the
  original score and awards `xpAwarded: 0` the second time (`complete-quiz` checks
  `completed_at`; `complete-shared-quiz` relies on the `(shared_quiz_id, player_user_id)`
  unique constraint).
- **Proportion.** A perfect 10-question quiz is worth 150 XP — the same as 150 swipes. That
  matches `design.md` §6's intent that "quiz performance meaningfully outweighs pure swipe
  volume."
- **No caps.** There is no daily limit on swipe XP or quiz XP.

### Open decisions

- **D1 — Skip pays the same as like.** Swiping left through a hundred cards earns 100 XP.
  Recommendation: keep it. Skips are real signal and the feed is meant to be swiped fast;
  penalising skips would nudge people into liking things they don't care about, which poisons
  the recommendation weights. Address farming with a cap (D2), not with asymmetry.
- **D2 — Daily swipe-XP cap.** Recommendation: cap swipe XP at **50/day** (quiz XP
  uncapped). Keeps the streak-and-swipe habit rewarding without making mindless volume the
  dominant strategy. The streak still updates on every swipe regardless of the cap.
- **D3 — Perfect-quiz bonus.** Recommendation: **+25 XP** flat bonus for 100% on a quiz of
  5+ questions. Cheap to implement, gives a clear "go for the clean run" target.
- **D4 — Should sharing earn anything?** Recommendation: no XP for sharing itself (easy to
  spam), but consider **+10 XP to the owner the first time someone else plays their shared
  quiz**. Rewards sharing that actually worked, not the act of tapping Share.

---

## 3. Streak

### As built

- Defined as **consecutive calendar days with at least one swipe**
  (`record_swipe_activity()` in `20260909090000_swipe_streak_xp.sql`).
- First swipe of a day: if the last active day was yesterday, `streak_count + 1`; if it was
  today, unchanged; anything older (or never), reset to 1.
- `longest_streak` is tracked but **not shown anywhere in the UI**.
- **Quizzes do not count.** Only `score-swipe` calls `record_swipe_activity`; completing a
  quiz on a day with no swipes does not keep the streak alive.
- **No streak protection / freeze.** `requirements.md` reserves that for premium.
- The "day" is `current_date` on the Postgres server, i.e. **UTC**, not the user's local
  day.

### Open decisions

- **D5 — Timezone.** A user in Berlin swiping at 00:30 local time is credited to the
  *previous* UTC day. Two swipes at 23:30 and 00:30 local, on consecutive local days, may
  count as one day. Recommendation: send the client's timezone (or local date) with the
  swipe and have `record_swipe_activity` compute the day in that zone. Small change, avoids
  a class of "my streak reset for no reason" complaints — which are the single most
  common complaint in every streak-based app.
- **D6 — Should a quiz count toward the streak?** Recommendation: **yes.** A quiz is a
  higher-effort action than a swipe; it's strange that it doesn't keep the streak alive.
  Implement by having `complete-quiz` also call `record_swipe_activity` (renamed to
  `record_daily_activity`) with the quiz XP as the delta instead of calling
  `increment_discovery_score` separately.
- **D7 — Show longest streak.** Recommendation: yes, on the profile next to the current
  one. It's already tracked; it's free.
- **D8 — Streak freeze (premium).** Out of scope until premium exists. Note only that the
  data model already supports it: a freeze is "treat one missed day as not missed."

---

## 4. Levels

### As built

- `level = 1 + floor(discovery_score / 100)` (`app/(tabs)/profile.tsx`).
- Linear, uncapped, purely cosmetic. Shown only as "Level N" on the profile header.
- No level-up moment, no names, nothing unlocks.

### Open decisions

- **D9 — Curve.** Linear means level 2 and level 50 cost the same 100 XP. Recommendation:
  keep linear for launch — it's transparent and the numbers are small — but define
  the level thresholds in one shared constant (`constants/gamification.ts`) so it can
  become a curve later without touching the UI. If a curve is wanted, the standard choice is
  `xpForLevel(n) = 100 × n^1.5` rounded, which keeps early levels quick and stretches later
  ones.
- **D10 — Progress to next level.** Recommendation: show "340 / 400 XP" and a thin bar
  under the level label. This is the single cheapest thing that makes XP feel like it's
  *for* something.
- **D11 — Level names.** Recommendation: not yet. Named tiers ("Wanderer", "Scholar") are
  nice but they collide with the badge names already in use (Rising Scholar, Scholar).
  Decide together with the badge set.
- **D12 — Level-up celebration.** Depends on D14 (memory) — the app has to know the
  previous level to notice a change. Recommendation: do it once badges are persisted, using
  the same mechanism.

---

## 5. Badges

### As built

Eleven badges, all defined in `lib/badges.ts` and evaluated live on every profile render.
Icons are in `constants/badge-icons.ts`.

| Badge | Earned when | Category |
|---|---|---|
| First Like | ≥ 1 liked article | milestone |
| Category Explorer | liked articles span ≥ 5 categories | breadth |
| Curator | ≥ 10 liked articles | volume |
| Bookworm | ≥ 25 liked articles | volume |
| Category Master | ≥ 8 likes in a single category | depth |
| Quiz Ace | **most recent** quiz scored ≥ 80% | quiz |
| Streak Keeper | streak ≥ 3 days | streak |
| Week Streak | streak ≥ 7 days | streak |
| Month Streak | streak ≥ 30 days | streak |
| Rising Scholar | XP ≥ 100 | XP |
| Scholar | XP ≥ 500 | XP |

Rules:

- Every badge is tied to real behaviour; there is deliberately no "opened the app" badge
  (`design.md` §6 and the `CLAUDE.md` guardrail).
- Because badges are recomputed from current data, **some can be lost**: Quiz Ace is based
  on the *last* quiz only, and the three streak badges are based on the *current* streak.
  Break a 7-day streak and Week Streak disappears.
- Unearned badges are shown dimmed, so the full set is visible as a target.
- No persistence, no earned-at date, no notification.

### Open decisions

- **D13 — Badges that can be un-earned.** This is the most confusing current behaviour: a
  badge is normally a permanent achievement. Recommendation: badges are **earned forever**
  once the condition is met. Make streak badges "reached a streak of N" (use
  `longest_streak`, not `streak_count`) and Quiz Ace "scored ≥ 80% on any quiz with 5+
  questions". This is a one-line change per badge but only becomes fully correct with D14.
- **D14 — Persist earned badges.** `requirements.md` puts the "badges/achievements system"
  in v2, and the code comment in `lib/badges.ts` anticipates a `user_badges` table.
  Recommendation: add `user_badges (user_id, badge_id, earned_at)`, written by the Edge
  Functions that change the underlying stats (`score-swipe`, `complete-quiz`). The client
  still evaluates `isEarned` for display of unearned targets, but "earned" comes from the
  table. This unlocks D12, D15, and un-losable badges (D13) in one move.
- **D15 — Celebrate on earn.** Recommendation: once D14 exists, a small bottom sheet after
  the action that earned it ("New badge: Week Streak"), never a blocking modal mid-swipe.
- **D16 — Fill the gaps in the set.** There's no badge for sharing, playing others' quizzes,
  or beating someone. Recommendation: add three, all behaviour-based — **Host** (someone
  else played your shared quiz), **Challenger** (played 5 shared quizzes), **Perfect Run**
  (100% on a 10-question quiz). Wait for D14 so they're persisted from day one.

---

## 6. Quiz mode

### As built

**Unlock.** The Quiz tab is locked until the user has **5 liked articles**
(`MIN_LIKES_TO_UNLOCK_QUIZ` in `constants/quiz.ts`). Below that it shows how many more are
needed. The constant is shared with `generate-quiz`, which enforces it server-side too.

**Generation** (`generate-quiz/index.ts`):

- Pool = the user's **15 most recently liked** articles (`MAX_ARTICLES_FOR_QUIZ`).
- Quiz length = **one question per article, max 10** (`MAX_QUESTIONS_PER_QUIZ`). A user with
  exactly 5 likes gets a 5-question quiz.
- Each question is multiple choice; the LLM is grounded strictly in the article extracts and
  a validator rejects questions about pages not in the pool (`design.md` §5 guardrail).
- **Retry-safe:** the pool is fingerprinted (`article_set_key`). Re-opening the tab with the
  same pool serves the same unfinished quiz back; only "New set of questions" (`reshuffle`)
  forces regeneration.
- The answer key is sent to the client so feedback is instant per question. This is an
  accepted v1 tradeoff — see the comment at the top of `20260907090000_quiz_schema.sql` —
  because the only person who can cheat is the quiz-taker, and XP is regraded server-side
  anyway.

**Playing.** One question at a time, instant right/wrong feedback, "Next" → "See results".
No timer.

**Completion** (`complete-quiz/index.ts`): answers are regraded against the stored key,
`score`/`completed_at` written, **+15 XP per correct answer**. Results screen shows a
headline (Great recall / Nice work / Keep exploring), `+N XP`, and the Share button.

**Limits.** None. Unlimited quizzes per day for everyone. `requirements.md` describes a
capped free tier with unlimited quizzes on premium, but the cap value is listed as an open
question there and nothing enforces one.

### Open decisions

- **D17 — Free-tier quiz cap.** Recommendation: don't add one until premium exists. A cap
  with nothing to upgrade to is pure friction. Note it in the premium spec instead.
- **D18 — "Reshuffle" vs pool.** Reshuffling regenerates questions from the *same* 15
  articles, so after two or three reshuffles the questions start repeating in substance.
  Recommendation: after the first quiz on a pool, widen the pool to the 30 most recent likes
  and sample 10 of them. Cheap, meaningfully more variety.
- **D19 — Quiz counts toward streak.** See D6.
- **D20 — Difficulty / question types.** Recommendation: leave as-is for launch. Multiple
  choice from extracts is the reliable, well-grounded format; true/false and fill-in-the-blank
  are the natural v2 additions once there's usage data on accuracy distribution.

---

## 7. Sharing and leaderboards

### As built

**What can be shared.** Only a **completed** quiz (`share-quiz` rejects unfinished
sessions). Sharing is idempotent: sharing the same quiz twice returns the same link.

**The link.** `Linking.createURL('/shared-quiz/<id>')` — a deep link of the form
`rabbithole://shared-quiz/<uuid>`, sent through the native share sheet with the message
*"I scored 7/10 on my rabbit hole quiz — think you can beat me?"*

**What the recipient sees** (`app/shared-quiz/[id].tsx` → `get-shared-quiz`):

- Must be signed in (guest counts). Gets the owner's name if the owner has opted in,
  otherwise "A friend's quiz".
- Plays the **exact same questions** as the owner (`quiz_questions` rows are referenced, never
  copied).
- **One play per person**, enforced by a unique constraint. A second open shows "You already
  played this quiz" and the leaderboard.
- Earns **+15 XP per correct answer**, same as an own quiz.

**The leaderboard.** Per shared quiz only. Every `quiz_plays` row for that share, sorted by
score. The owner is seeded onto it at share time with their original score so they're
always present. Names are resolved through `get_leaderboard_display_names()`, which returns a
name **only for users with `leaderboard_opt_in = true`**; everyone else renders as "A player".
The current user always sees themselves as "You".

**Owner's view.** The Quiz tab lists "Your shared quizzes" with a play count each, tapping
through to that quiz's leaderboard.

**Privacy guarantees (do not weaken):**

- `quiz_plays` is readable only by the share's owner and by people who have themselves
  played it (`has_played_shared_quiz()` in `20260907180000_…`). Nobody can enumerate scores
  for quizzes they weren't part of.
- Opt-in is the *only* gate on showing a name to another person. Default is off. There is no
  global leaderboard, so opting in currently exposes your display name only on quizzes you
  played.
- `display_name` defaults to the email prefix (or "Guest") and is not editable yet.

### What does not exist

- **No global or friends leaderboard.** `requirements.md` puts opt-in leaderboards in v3.
- **No web fallback for the link.** A recipient without the app installed gets a dead
  `rabbithole://` link — nothing opens, no store redirect. This is the biggest practical gap
  in the sharing loop.
- **No notification** to the owner when someone plays their quiz.
- **No way to edit `display_name`.**

### Open decisions

- **D21 — Web landing page for share links.** Recommendation: **do this before launch.**
  A static page at `sdogantekin.github.io/rabbit-hole/q/<id>` (same GitHub Pages site as the
  privacy policy) that shows "Someone challenged you" + a Play Store button, and opens the
  app via the deep link if installed. Use Android App Links (`https://` links verified via
  `assetlinks.json`) so the app opens directly when installed. Without this, sharing only
  works between people who both already have the app, which defeats the growth purpose in
  `requirements.md` §4.
- **D22 — Editable display name.** Recommendation: yes, a single field on the profile, before
  launch. "serkan.dogantekin" as a leaderboard name is fine for testing but not what people
  want to show friends. Validate length (2–24) and strip whitespace; no uniqueness needed.
- **D23 — Global leaderboard.** Recommendation: **not for launch.** It changes the privacy
  posture (opt-in would then mean "visible to everyone", not "visible to people I quizzed
  with") and it rewards volume over recall. If added later, make it **weekly XP**, not
  all-time, so new users aren't permanently at the bottom.
- **D24 — Friends.** Recommendation: not for launch. Per-quiz leaderboards already give the
  "beat my friends" loop without a social graph. Revisit only if share → play conversion is
  strong.
- **D25 — Owner notification on play.** Recommendation: v2, alongside push notifications
  generally. For now the play count on "Your shared quizzes" is the signal.

---

## 8. Flows

### 8.1 Swipe

```
user swipes (like/skip)
  → client: deck advances immediately, no wait
  → score-swipe (Edge Function)
      → apply_interest_weight_delta  (+0.15 like / −0.05 skip on the card's categories)
      → record_swipe_activity        (+1 XP; streak logic in §3)
  → client invalidates profile query → header streak/XP badge refreshes
```

### 8.2 Own quiz

```
Quiz tab
  liked < 5  → locked state, "Like N more to unlock"
  liked ≥ 5  → "Start quiz"
    → generate-quiz
        same pool as an unfinished quiz? → return it
        else → LLM → validate grounding → store session + questions → return
    → answer questions one by one (instant feedback from bundled key)
    → "See results" → complete-quiz
        already completed? → return stored result, 0 XP
        else → regrade server-side → +15 XP/correct → results
    → results: headline, +N XP, [Share quiz] [New set of questions] [Done]
```

### 8.3 Share → play → leaderboard

```
owner taps Share on results
  → share-quiz (idempotent; seeds owner's own play row)
  → native share sheet with rabbithole://shared-quiz/<id>

recipient opens link (app installed, signed in — guest is fine)
  → /shared-quiz/<id> → get-shared-quiz
      already played? → leaderboard directly
      else → "<Owner>'s quiz · 10 questions" → [Play]
        → same questions → complete-shared-quiz
            → regrade → insert quiz_plays → +15 XP/correct
        → leaderboard: everyone who played, sorted by score;
          names only for opted-in players, "You" for self
```

---

## 9. All open decisions, in one place

Each needs a yes/no or a number. Recommendations are mine; nothing is implemented until
decided.

| # | Decision | Recommendation | Size |
|---|---|---|---|
| D1 | Skip XP = like XP? | Keep equal | — |
| D2 | Daily swipe-XP cap | 50/day, quiz XP uncapped | S |
| D3 | Perfect-quiz bonus | +25 XP for 100% on 5+ questions | S |
| D4 | XP for sharing | None for sharing; +10 to owner on first outside play | S |
| D5 | Streak day = user's local day, not UTC | Yes | S |
| D6 | Quiz completion counts toward streak | Yes | S |
| D7 | Show longest streak on profile | Yes | XS |
| D8 | Streak freeze | Premium only, later | — |
| D9 | Level curve | Linear for launch, thresholds in one constant | XS |
| D10 | XP progress bar to next level | Yes | S |
| D11 | Level names | Not yet | — |
| D12 | Level-up celebration | After D14 | S |
| D13 | Badges can't be un-earned | Yes (use longest_streak; "any quiz ≥ 80%") | S |
| D14 | Persist earned badges (`user_badges`) | Yes — enables D12/D13/D15/D16 | M |
| D15 | Badge-earned bottom sheet | After D14 | S |
| D16 | New badges: Host, Challenger, Perfect Run | After D14 | S |
| D17 | Free-tier quiz cap | Not until premium exists | — |
| D18 | Widen reshuffle pool to 30 likes | Yes | S |
| D19 | = D6 | | |
| D20 | New question types | v2 | — |
| D21 | Web landing page + App Links for share URLs | **Yes, before launch** | M |
| D22 | Editable display name | Yes, before launch | S |
| D23 | Global leaderboard | Not for launch; weekly XP if ever | — |
| D24 | Friends / social graph | Not for launch | — |
| D25 | Notify owner on play | v2 with push | — |

Suggested order if all recommendations are accepted: **D21, D22** (they gate whether
sharing works for real users at all) → **D5, D6, D7, D10** (small, fix visible rough edges)
→ **D14 then D13/D15/D16/D12** (one coherent "badges have memory" change) → **D2, D3, D4,
D18** (tuning, best done once there's some usage data).

---

## 10. Invariants — things every future change must keep true

- **XP and scores are computed server-side, never trusted from the client.**
- **Every XP-awarding call is idempotent.** Retrying it never double-awards.
- **Nobody's name is shown to another person without `leaderboard_opt_in`.** Default off.
- **Score data is visible only to participants** of the quiz it belongs to.
- **No badge for a trivial or passive action.** Every badge is something the user *did*.
- **Quiz questions are answerable from the liked articles' extracts only** (`design.md` §5).
  No gamification change may loosen grounding to make quizzes "more fun".
- **Streak, level, badges must never be a reason to collect more data than
  `requirements.md` §7's privacy section allows.** (Local timezone for D5 is fine — it's not
  stored.)
