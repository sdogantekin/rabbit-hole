-- User-reported: every shared quiz showed the same generic "Your liked-articles quiz" /
-- "{name}'s quiz" label, so a user with several shared quizzes couldn't tell them apart on
-- the Quiz tab. generate-quiz now derives a deterministic title from the article pool's own
-- titles at generation time (no extra LLM call) and stores it here. Nullable, and left null
-- for quizzes generated before this migration — the client falls back to the old generic
-- label when title is null, so nothing breaks for already-shared quizzes.
alter table public.quiz_sessions
  add column title text;

-- Mirrors 20260907170000's fix for quiz_questions: get-shared-quiz is called by the
-- recipient, not the owner, so reading quiz_sessions.title for a shared session needs the
-- same "readable once shared" second policy — the existing owner-only policy alone would
-- silently return no row for anyone but the owner. Postgres RLS OR-combines policies on the
-- same table, so the owner-only policy keeps working for personal quiz-taking unchanged.
-- The unqualified `id` on the right must be `quiz_sessions.id`: shared_quizzes has its own
-- `id` column too, and Postgres resolves an unqualified name to the innermost scope first,
-- so an unqualified `id` here silently binds to sq.id instead — a self-referential condition
-- that's essentially always false, not the correlated reference this needs.
create policy "quiz sessions are readable once shared"
  on public.quiz_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.shared_quizzes sq
      where sq.source_quiz_session_id = quiz_sessions.id
    )
  );
