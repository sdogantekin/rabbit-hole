-- Fixes a real edge case surfaced while testing D5 (gamification.md §3), not a hypothetical:
-- since p_timezone now varies per call, a user's timezone-computed "today" can be BEFORE a
-- previously recorded last_active_date — most plausibly when traveling westward across the
-- date line (e.g. Tokyo, UTC+9, to Los Angeles, UTC-8 — LA's "today" can trail Tokyo's by a
-- full day right after landing). The original version unconditionally set
-- last_active_date = v_today, which would move it backward in that case; this also broke
-- an invalid-timezone-fallback test the same way. A day recorded as "active" should never
-- become un-recorded, so this only ever advances last_active_date, never rewinds it, and
-- treats "today didn't move the recorded day forward" as the same no-op case as swiping
-- again later the same day: XP still accrues, streak/day bookkeeping doesn't.
create or replace function public.record_daily_activity(
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

  if v_last_active is null then
    v_streak := 1;
  elsif v_today <= v_last_active then
    -- Same day, or a backward day-boundary artifact (timezone change, invalid-timezone
    -- fallback) — no forward progress to record. XP still accrues below.
    null;
  elsif v_today = v_last_active + 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles
  set streak_count = v_streak,
      longest_streak = greatest(v_longest, v_streak),
      last_active_date = greatest(v_last_active, v_today),
      discovery_score = discovery_score + p_xp_delta
  where id = p_user_id;
end;
$$;
