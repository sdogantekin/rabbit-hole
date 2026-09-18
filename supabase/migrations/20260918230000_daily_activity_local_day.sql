-- D5 + D6 (gamification.md §3, §6): record_swipe_activity is renamed record_daily_activity
-- and grows two changes:
--
-- D5 — the streak "day" was current_date on the Postgres server, i.e. always UTC. A Berlin
-- user swiping at 00:30 local time got credited to the previous UTC day, which is the single
-- most common false-reset complaint in any streak product. p_timezone (an IANA zone name
-- from the client, e.g. Intl.DateTimeFormat().resolvedOptions().timeZone) lets "today" be
-- computed in the user's own day instead. Falls back to UTC for a missing/invalid zone
-- rather than failing the whole call — a bad timezone string should never block a swipe or
-- quiz completion from recording.
--
-- D6 — only score-swipe ever called this, so completing a quiz on a day with no swipes did
-- not keep the streak alive despite being a higher-effort action than a swipe. complete-quiz
-- and complete-shared-quiz now call this too (with their XP delta) instead of calling
-- increment_discovery_score directly. increment_discovery_score itself is left in place —
-- gamification.md D4 (XP to a quiz owner when someone else plays their shared quiz)
-- deliberately needs a streak-free XP increment, since the owner didn't do anything that day.
create function public.record_daily_activity(
  p_user_id uuid,
  p_xp_delta integer,
  p_timezone text default 'UTC'
)
returns void
language plpgsql
as $$
declare
  v_last_active date;
  v_streak integer;
  v_longest integer;
  v_today date;
begin
  begin
    v_today := (now() at time zone p_timezone)::date;
  exception when others then
    v_today := (now() at time zone 'UTC')::date;
  end;

  select last_active_date, streak_count, longest_streak
    into v_last_active, v_streak, v_longest
    from public.profiles
    where id = p_user_id
    for update;

  if v_last_active is null or v_last_active < v_today - 1 then
    -- first activity ever, or the streak was already broken by a missed day
    v_streak := 1;
  elsif v_last_active = v_today - 1 then
    v_streak := v_streak + 1;
  end if;
  -- v_last_active = v_today (already active today): streak_count is left unchanged below —
  -- the streak counts days, not actions — but XP still accrues every time.

  update public.profiles
  set streak_count = v_streak,
      longest_streak = greatest(v_longest, v_streak),
      last_active_date = v_today,
      discovery_score = discovery_score + p_xp_delta
  where id = p_user_id;
end;
$$;

drop function public.record_swipe_activity(uuid, integer);
