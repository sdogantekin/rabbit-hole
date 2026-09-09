-- Swipe-based streak/XP (design.md §6: "small amount per swipe" and "counts consecutive
-- days with at least one swipe; resets on a missed day"). profiles.streak_count,
-- longest_streak, and last_active_date have existed since the onboarding migration but
-- nothing has ever written to them — quiz completion already awards its own (larger) XP via
-- increment_discovery_score; this is the swipe side of the same mechanic.
--
-- plpgsql rather than the sql-language style apply_interest_weight_delta/
-- increment_discovery_score use, since the streak logic needs conditional branching on
-- "today vs. yesterday vs. further back," not just a single atomic expression. security
-- invoker (the default) keeps this subject to profiles' owner-only update RLS, same
-- reasoning as increment_discovery_score.
create function public.record_swipe_activity(
  p_user_id uuid,
  p_xp_delta integer
)
returns void
language plpgsql
as $$
declare
  v_last_active date;
  v_streak integer;
  v_longest integer;
  v_today date := current_date;
begin
  select last_active_date, streak_count, longest_streak
    into v_last_active, v_streak, v_longest
    from public.profiles
    where id = p_user_id
    for update;

  if v_last_active is null or v_last_active < v_today - 1 then
    -- first swipe ever, or the streak was already broken by a missed day
    v_streak := 1;
  elsif v_last_active = v_today - 1 then
    v_streak := v_streak + 1;
  end if;
  -- v_last_active = v_today (already swiped today): streak_count is left unchanged below —
  -- the streak counts days, not swipes — but XP still accrues every time.

  update public.profiles
  set streak_count = v_streak,
      longest_streak = greatest(v_longest, v_streak),
      last_active_date = v_today,
      discovery_score = discovery_score + p_xp_delta
  where id = p_user_id;
end;
$$;
