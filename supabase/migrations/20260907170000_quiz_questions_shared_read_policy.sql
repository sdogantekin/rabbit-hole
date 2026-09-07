-- quiz_questions' only existing select policy scopes to the original quiz_sessions owner
-- (see quiz_schema migration), which silently blocked a shared-quiz player from ever reading
-- the questions they're meant to play — get-shared-quiz returned an empty question list for
-- anyone but the owner. Once a session has been shared, its questions are meant to be
-- readable by any authenticated player, so add a second select policy for that case;
-- Postgres RLS OR-combines multiple policies on the same table, so the owner-only policy
-- keeps working for personal quiz-taking exactly as before.
create policy "quiz questions are readable once their session is shared"
  on public.quiz_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.shared_quizzes sq
      where sq.source_quiz_session_id = quiz_session_id
    )
  );
