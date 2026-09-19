-- Bug: user_interests was doing double duty as both "categories the user explicitly
-- selected" (what the Edit Interests screen should show as checked) and "categories with a
-- tracked recommendation weight" (written by apply_interest_weight_delta on every swipe,
-- for ANY category the swiped article belongs to, whether or not the user ever picked it —
-- that's the intentional "exploration" discovery mechanic in get-feed). Since Edit Interests
-- read "row exists in user_interests" as "selected", a user who swiped broadly enough to
-- accumulate a weight row for every category saw every category checked, and unchecking one
-- did nothing (saveUserInterests only ever inserted, never removed).
--
-- selected distinguishes the two: apply_interest_weight_delta's own insert never sets it
-- (defaults false, since a swipe-derived row wasn't an explicit choice), while
-- saveUserInterests (onboarding + Edit Interests) is the only thing that flips it. Feed
-- sampling in get-feed is intentionally untouched — it already reads the whole weight table
-- regardless of this flag, and should keep doing so; only "what shows as checked" changes.
--
-- Backfill: there is no way to recover which of an existing row was an original explicit
-- pick vs. purely swipe-derived — that distinction was never recorded. Backfilling true
-- preserves today's (buggy but non-blocking) "everything shows checked" display rather than
-- silently unselecting things and blocking Save on some users being under
-- MIN_INTEREST_SELECTION; the real fix takes effect the next time a user opens Edit
-- Interests and saves, since saveUserInterests now actually reconciles selected state
-- instead of only ever inserting.
alter table public.user_interests
  add column selected boolean not null default false;

update public.user_interests set selected = true;
