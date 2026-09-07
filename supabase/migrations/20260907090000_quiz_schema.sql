-- Quiz mode: sessions of short multiple-choice quizzes generated from a user's liked
-- articles (requirements.md §6.4, design.md §2/§5). generate-quiz and complete-quiz Edge
-- Functions are the only writers.
--
-- Note on correct_option_index visibility: RLS below grants owner-select on quiz_questions,
-- so a determined user could read their own answer key directly via the REST API rather
-- than through the app. That's an accepted v1 tradeoff, not an oversight — this is a
-- single-player recall tool, so the only person who could "cheat" is the quiz-taker
-- themselves, and generate-quiz's response already includes the answer key anyway to
-- support instant per-question feedback in the UI (see generate-quiz/index.ts). What RLS
-- and complete-quiz actually guard is XP integrity: score/XP are always recomputed
-- server-side from stored answers, never trusted from the client.

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer not null default 0,
  total_questions integer not null,
  -- Sorted "lang:pageid" list this quiz was generated from — lets generate-quiz serve back
  -- an in-progress quiz on retry instead of regenerating (design.md §5's caching requirement)
  -- while a `reshuffle` request still forces a fresh one.
  article_set_key text not null
);

alter table public.quiz_sessions enable row level security;

create policy "quiz sessions are readable by their owner"
  on public.quiz_sessions for select
  using (auth.uid() = user_id);

create policy "quiz sessions are insertable by their owner"
  on public.quiz_sessions for insert
  with check (auth.uid() = user_id);

create policy "quiz sessions are updatable by their owner"
  on public.quiz_sessions for update
  using (auth.uid() = user_id);
-- No delete: quiz history is append-only, same as swipes.

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  article_pageid bigint not null,
  article_lang text not null default 'en',
  question_text text not null,
  options text[] not null,
  correct_option_index integer not null,
  user_answer_index integer,
  -- Insert order isn't guaranteed to survive a round-trip through PostgREST, and the UI
  -- needs a stable "Question N of total" sequence, so track it explicitly.
  question_order integer not null,
  constraint quiz_questions_correct_option_in_range
    check (correct_option_index >= 0 and correct_option_index < array_length(options, 1))
);

alter table public.quiz_questions enable row level security;

-- Owner-scoped via a join since quiz_questions has no user_id column of its own.
create policy "quiz questions are readable by their session owner"
  on public.quiz_questions for select
  using (exists (
    select 1 from public.quiz_sessions qs
    where qs.id = quiz_session_id and qs.user_id = auth.uid()
  ));

create policy "quiz questions are insertable by their session owner"
  on public.quiz_questions for insert
  with check (exists (
    select 1 from public.quiz_sessions qs
    where qs.id = quiz_session_id and qs.user_id = auth.uid()
  ));

create policy "quiz questions are updatable by their session owner"
  on public.quiz_questions for update
  using (exists (
    select 1 from public.quiz_sessions qs
    where qs.id = quiz_session_id and qs.user_id = auth.uid()
  ));

create index quiz_questions_session_idx on public.quiz_questions (quiz_session_id);

-- Atomic XP award, same pattern as apply_interest_weight_delta. security invoker (the
-- default) keeps this subject to profiles' owner-only update RLS.
create function public.increment_discovery_score(
  p_user_id uuid,
  p_delta integer
)
returns void
language sql
as $$
  update public.profiles
  set discovery_score = discovery_score + p_delta
  where id = p_user_id;
$$;
