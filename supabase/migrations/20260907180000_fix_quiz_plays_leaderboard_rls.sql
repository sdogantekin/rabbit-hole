-- The quiz_plays select policy from quiz_sharing_schema.sql referenced quiz_plays inside its
-- own USING clause (checking "does another row for me exist here") — a classic
-- self-referential RLS bug. Postgres evaluates that inner EXISTS against quiz_plays subject
-- to the SAME policy, so a non-owner participant's own row can never bootstrap "visible" from
-- an empty starting set. Found by testing, not just review: a friend's own just-submitted
-- score was invisible to their own immediate re-fetch, breaking complete-shared-quiz's
-- idempotency check. Fix: move the "have I played this shared quiz" check into a security
-- definer function, which runs with RLS bypassed internally and breaks the cycle.
drop policy "quiz plays are readable by shared-quiz participants" on public.quiz_plays;

create function public.has_played_shared_quiz(p_shared_quiz_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.quiz_plays
    where shared_quiz_id = p_shared_quiz_id and player_user_id = p_user_id
  );
$$;

create policy "quiz plays are readable by shared-quiz participants"
  on public.quiz_plays for select
  using (
    exists (
      select 1 from public.shared_quizzes sq
      where sq.id = shared_quiz_id
        and (sq.owner_user_id = auth.uid() or public.has_played_shared_quiz(shared_quiz_id, auth.uid()))
    )
  );
