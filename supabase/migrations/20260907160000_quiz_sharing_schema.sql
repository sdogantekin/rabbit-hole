-- Quiz sharing (basic v1, per requirements.md's growth goals — no friends/social graph yet):
-- a completed quiz can be turned into a link anyone can open to play the same questions and
-- land on a leaderboard of everyone who has. See design docs discussion; this intentionally
-- skips a friends-picker/invite system — that's a much bigger build than sharing itself.

-- No signup flow has ever set profiles.display_name (the UI hardcodes "Explorer" as a
-- stand-in), so there was never a name to show anyone else. This is the first feature that
-- actually needs one. Email prefix is a reasonable default identity; anonymous/guest
-- sign-ins get "Guest" since they have no email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, locale, display_name)
  values (
    new.id,
    'en',
    case when new.email is not null then split_part(new.email, '@', 1) else 'Guest' end
  );
  return new;
end;
$$;

-- Backfill existing accounts (created before this migration) once, so today's users aren't
-- stuck nameless forever — the trigger above only fires for new signups from here on.
update public.profiles p
set display_name = case when u.email is not null then split_part(u.email, '@', 1) else 'Guest' end
from auth.users u
where u.id = p.id and p.display_name is null;

-- A share of one specific completed quiz_sessions row. Deliberately thin: the actual
-- questions/answer key are never copied, just referenced via source_quiz_session_id, since
-- quiz_questions rows are immutable after generation (see generate-quiz).
create table public.shared_quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  source_quiz_session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.shared_quizzes enable row level security;

-- Readable by anyone authenticated: the row itself carries no sensitive data (just ids),
-- and the whole point is that a link recipient who isn't the owner can look it up.
create policy "shared quizzes are readable by anyone authenticated"
  on public.shared_quizzes for select
  to authenticated
  using (true);

create policy "shared quizzes are insertable by their owner"
  on public.shared_quizzes for insert
  with check (auth.uid() = owner_user_id);

-- One row per person who has played a given shared quiz (the owner included — see
-- share-quiz, which seeds the owner's own row at share time so the leaderboard query never
-- needs to special-case them). A unique constraint makes "already played" a simple existence
-- check and keeps complete-shared-quiz's idempotency guarantee enforceable at the DB level,
-- not just in application code.
create table public.quiz_plays (
  id uuid primary key default gen_random_uuid(),
  shared_quiz_id uuid not null references public.shared_quizzes (id) on delete cascade,
  player_user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  played_at timestamptz not null default now(),
  unique (shared_quiz_id, player_user_id)
);

alter table public.quiz_plays enable row level security;

-- Deliberately narrower than "any authenticated user can read every row" — that would let
-- anyone dump every score for every shared quiz in the system, not just ones they have a
-- reason to know about. Visible only to the quiz's owner and to people who have themselves
-- played it, which matches exactly when the app ever actually queries this (the owner's own
-- list, or a leaderboard opened by someone who just played).
create policy "quiz plays are readable by shared-quiz participants"
  on public.quiz_plays for select
  using (
    exists (
      select 1 from public.shared_quizzes sq
      where sq.id = shared_quiz_id
        and (
          sq.owner_user_id = auth.uid()
          or exists (
            select 1 from public.quiz_plays qp
            where qp.shared_quiz_id = shared_quiz_id and qp.player_user_id = auth.uid()
          )
        )
    )
  );

create policy "quiz plays are insertable by the player"
  on public.quiz_plays for insert
  with check (auth.uid() = player_user_id);

create index quiz_plays_shared_quiz_idx on public.quiz_plays (shared_quiz_id);

-- profiles' own RLS is owner-only (auth.uid() = id), so nothing else can read another
-- player's display_name at all, opted in or not. A blanket "readable when opted in" RLS
-- policy would leak every other column too (streak, discovery_score, avatar_url, ...) since
-- Postgres RLS is row-level, not column-level. This function is the narrow alternative:
-- security definer, returns exactly id + display_name, and only for rows where
-- leaderboard_opt_in is true — the gate the user chose for this feature. A player who
-- hasn't opted in simply doesn't come back in the result; the caller renders those as
-- anonymous rather than getting an error.
create function public.get_leaderboard_display_names(p_user_ids uuid[])
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name
  from public.profiles p
  where p.id = any(p_user_ids) and p.leaderboard_opt_in = true;
$$;
