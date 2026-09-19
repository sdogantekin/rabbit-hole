-- D12 (gamification.md §4): a level-up celebration needs the app to know the *previous*
-- level to notice a change — profiles never tracked that, only discovery_score itself.
-- last_seen_level defaults to 1 (level 1 is what a brand-new profile is already "at", so
-- there's nothing to celebrate until XP actually crosses into level 2).
alter table public.profiles
  add column last_seen_level integer not null default 1;

-- Mirrors evaluate_and_award_badges()'s shape: security definer, reads auth.uid() itself
-- (never a client-supplied id) rather than accepting a parameter, so it can only ever update
-- the caller's own row. Returns the new level only the first time it's crossed — a second
-- call at the same discovery_score returns null, same "only fire once" behavior the badges
-- table gets from `on conflict do nothing`.
--
-- The `/ 100` here must match XP_PER_LEVEL in app/(tabs)/profile.tsx — that's the only other
-- place this number appears; keep them in sync by hand if the level curve ever changes (D9).
create function public.check_level_up()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_score integer;
  v_last_seen integer;
  v_current_level integer;
begin
  if v_user_id is null then
    return null;
  end if;

  select discovery_score, last_seen_level into v_score, v_last_seen
    from public.profiles
    where id = v_user_id
    for update;

  v_current_level := 1 + (v_score / 100);

  if v_current_level > v_last_seen then
    update public.profiles set last_seen_level = v_current_level where id = v_user_id;
    return v_current_level;
  end if;

  return null;
end;
$$;
