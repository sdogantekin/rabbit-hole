-- D16 + D15 (gamification.md §5): three new badges (Host, Challenger, Perfect Run), and
-- evaluate_and_award_badges() now reports back which badge ids were newly earned by THIS
-- call (via `insert ... returning`, which only returns rows the insert actually inserted —
-- conflicting/already-earned rows are silently skipped by `on conflict do nothing` and never
-- appear here) so the client can show a small "New badge" celebration right after the action
-- that earned it, per D15. A call that earns nothing returns zero rows, not null.
--
-- Postgres won't let `create or replace` change a function's return type (void -> table),
-- so the old one is dropped first.
drop function public.evaluate_and_award_badges();

create function public.evaluate_and_award_badges()
returns table (awarded_badge_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_streak_count integer;
  v_discovery_score integer;
  v_liked_count integer;
  v_distinct_categories integer;
  v_max_category_count integer;
  v_last_quiz_score integer;
  v_last_quiz_total integer;
  v_last_quiz_accuracy numeric;
  v_hosted_a_play boolean;
  v_challenger_count integer;
  v_perfect_run boolean;
begin
  if v_user_id is null then
    return;
  end if;

  select streak_count, discovery_score into v_streak_count, v_discovery_score
    from public.profiles
    where id = v_user_id;

  select count(*) into v_liked_count
    from public.saved_articles
    where user_id = v_user_id;

  select count(distinct cat), max(cat_count) into v_distinct_categories, v_max_category_count
    from (
      select cat, count(*) as cat_count
      from public.saved_articles sa
      join public.articles_cache ac
        on ac.wikipedia_pageid = sa.article_pageid and ac.lang = sa.article_lang
      cross join lateral unnest(ac.categories) as cat
      where sa.user_id = v_user_id
      group by cat
    ) per_category;

  select score, total_questions into v_last_quiz_score, v_last_quiz_total
    from public.quiz_sessions
    where user_id = v_user_id and completed_at is not null
    order by completed_at desc
    limit 1;

  v_last_quiz_accuracy := case
    when v_last_quiz_total > 0 then v_last_quiz_score::numeric / v_last_quiz_total
    else null
  end;

  -- Host: someone else played a quiz this user shared. The owner's own seeded play row
  -- (share-quiz) must not count as "someone else played it".
  select exists (
    select 1
    from public.quiz_plays qp
    join public.shared_quizzes sq on sq.id = qp.shared_quiz_id
    where sq.owner_user_id = v_user_id and qp.player_user_id <> v_user_id
  ) into v_hosted_a_play;

  -- Challenger: played 5 *other people's* shared quizzes — excludes the owner's own seeded
  -- row on their own share, which would otherwise inflate this for free.
  select count(*) into v_challenger_count
    from public.quiz_plays qp
    join public.shared_quizzes sq on sq.id = qp.shared_quiz_id
    where qp.player_user_id = v_user_id and sq.owner_user_id <> v_user_id;

  -- Perfect Run: 100% on a 10-question quiz, own or shared — a full-length quiz (the cap in
  -- constants/quiz.ts) aced either way is the same accomplishment.
  select exists (
    select 1 from public.quiz_sessions
    where user_id = v_user_id and total_questions = 10 and score = 10
    union all
    select 1 from public.quiz_plays
    where player_user_id = v_user_id and total_questions = 10 and score = 10
  ) into v_perfect_run;

  return query
  insert into public.user_badges (user_id, badge_id)
  select v_user_id, b.badge_id
  from (values
    ('first-like', coalesce(v_liked_count, 0) >= 1),
    ('explorer', coalesce(v_distinct_categories, 0) >= 5),
    ('curator', coalesce(v_liked_count, 0) >= 10),
    ('bookworm', coalesce(v_liked_count, 0) >= 25),
    ('category-master', coalesce(v_max_category_count, 0) >= 8),
    ('quiz-ace', coalesce(v_last_quiz_accuracy, 0) >= 0.8),
    ('streak-keeper', coalesce(v_streak_count, 0) >= 3),
    ('week-streak', coalesce(v_streak_count, 0) >= 7),
    ('month-streak', coalesce(v_streak_count, 0) >= 30),
    ('rising-scholar', coalesce(v_discovery_score, 0) >= 100),
    ('scholar', coalesce(v_discovery_score, 0) >= 500),
    ('host', coalesce(v_hosted_a_play, false)),
    ('challenger', coalesce(v_challenger_count, 0) >= 5),
    ('perfect-run', coalesce(v_perfect_run, false))
  ) as b(badge_id, earned)
  where b.earned
  on conflict (user_id, badge_id) do nothing
  returning user_badges.badge_id;
end;
$$;
