-- D14 (gamification.md §5): badges were computed live on every profile render
-- (lib/badges.ts), which meant they could be un-earned — break a 7-day streak and Week
-- Streak disappears. This table makes "earned" permanent: once a threshold is crossed, it
-- stays crossed, no matter what the underlying stat does later. This also fixes D13 as a
-- side effect, exactly as gamification.md predicted: a badge is written the moment its
-- condition is first true, so a later drop (a broken streak, a worse quiz) can never
-- retract it.
create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "user badges are readable by their owner"
  on public.user_badges for select
  using (auth.uid() = user_id);

-- Deliberately no insert/update/delete policy for the authenticated role: a blanket
-- "auth.uid() = user_id" insert policy would let a modified client award itself any badge
-- id directly via the REST API, since RLS only checks ownership, not the actual condition.
-- evaluate_and_award_badges() below is the only writer — security definer so it can bypass
-- RLS for its own insert, but it takes no user_id parameter and reads auth.uid() itself, so
-- it can only ever award badges to the caller, never to another user.
--
-- The thresholds here intentionally mirror lib/badges.ts's BADGE_DEFINITIONS (now display-
-- only: id, label, icon) — this function is the actual source of truth for "earned" and the
-- two must be kept in sync by hand if a threshold or badge set ever changes.
create function public.evaluate_and_award_badges()
returns void
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
    ('scholar', coalesce(v_discovery_score, 0) >= 500)
  ) as b(badge_id, earned)
  where b.earned
  on conflict (user_id, badge_id) do nothing;
end;
$$;
