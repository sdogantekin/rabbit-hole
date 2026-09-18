-- D22 (gamification.md §7): display_name becomes user-editable from this point on. It's
-- shown to other people (leaderboards, "<Owner>'s quiz"), so a length bound is defense in
-- depth against a broken or modified client, not just UI polish — the app itself enforces
-- the tighter 2-24 char rule from gamification.md, this is just the outer safety net.
alter table public.profiles
  add constraint display_name_length check (
    display_name is null or char_length(display_name) between 1 and 40
  );
