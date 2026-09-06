-- Swipe feed: cached Wikipedia content + per-user swipe/like history.
-- See design.md §2. `swipes` and `saved_articles` add `article_lang` beyond design.md's
-- column list: Wikipedia pageids are only unique within a language edition, so without it
-- the "never show the same article twice" anti-join and the swipe dedupe constraint would
-- be wrong the moment a second language exists (requirements.md §9 already requires the
-- schema not to assume English-only).

create table public.articles_cache (
  wikipedia_pageid bigint not null,
  lang text not null default 'en',
  title text not null,
  extract text not null,
  thumbnail_url text,
  source_url text not null,
  -- Curated interest_categories.id values this article was filed under by wiki-proxy, not
  -- raw Wikipedia categories (see CLAUDE.md). No per-element FK (Postgres can't FK into
  -- array elements); wiki-proxy is the only writer and only ever inserts ids it sourced
  -- from interest_categories.
  categories text[] not null default '{}',
  cached_at timestamptz not null default now(),
  ttl_expires_at timestamptz not null,
  primary key (lang, wikipedia_pageid)
);

alter table public.articles_cache enable row level security;

create policy "articles cache is public read"
  on public.articles_cache for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policy for anon/authenticated: absence of a policy denies by
-- default. Only wiki-proxy's service-role client (which bypasses RLS) writes here.

create index articles_cache_categories_gin_idx
  on public.articles_cache using gin (categories);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_pageid bigint not null,
  article_lang text not null default 'en',
  direction text not null check (direction in ('like', 'skip')),
  -- Primary category for display/logging only; the weight update in score-swipe always
  -- re-derives the full category list from articles_cache server-side, never trusts this.
  category_id text not null references public.interest_categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint swipes_user_article_unique unique (user_id, article_lang, article_pageid)
);
-- The unique constraint is both the anti-join guarantee for get-feed and the idempotency
-- key for a retried swipe submission in score-swipe.

alter table public.swipes enable row level security;

create policy "swipes are readable by their owner"
  on public.swipes for select
  using (auth.uid() = user_id);

create policy "swipes are insertable by their owner"
  on public.swipes for insert
  with check (auth.uid() = user_id);
-- No update/delete: swipes are an append-only log, no undo in v1.

create table public.saved_articles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_pageid bigint not null,
  article_lang text not null default 'en',
  saved_at timestamptz not null default now(),
  primary key (user_id, article_lang, article_pageid)
);

alter table public.saved_articles enable row level security;

create policy "saved articles are readable by their owner"
  on public.saved_articles for select
  using (auth.uid() = user_id);

create policy "saved articles are insertable by their owner"
  on public.saved_articles for insert
  with check (auth.uid() = user_id);
-- No update/delete: "unsave" isn't in this slice's scope.

-- Atomic clamped weight update, called from score-swipe. security invoker (the default) is
-- deliberate: it runs as the calling user, so the existing owner-only RLS on user_interests
-- still applies — p_user_id must equal auth.uid() or the insert/update is rejected, same as
-- if the caller had written the row directly. A new category starts from the same 1.0
-- baseline onboarding uses.
create function public.apply_interest_weight_delta(
  p_user_id uuid,
  p_category_id text,
  p_delta real,
  p_floor real,
  p_cap real
)
returns void
language sql
as $$
  insert into public.user_interests (user_id, category_id, weight)
  values (p_user_id, p_category_id, greatest(p_floor, least(p_cap, 1.0 + p_delta)))
  on conflict (user_id, category_id)
  do update set weight = greatest(p_floor, least(p_cap, public.user_interests.weight + p_delta));
$$;

-- Backs get-feed's "never show the same article twice" requirement plus the weighted
-- per-category sampling itself. security invoker (the default) means the swipes anti-join
-- is still subject to swipes' owner-only RLS — p_user_id must equal auth.uid() for the
-- caller to see anything, same safety property as apply_interest_weight_delta above.
create function public.get_unseen_articles_for_category(
  p_user_id uuid,
  p_category_id text,
  p_lang text,
  p_limit int
)
returns setof public.articles_cache
language sql
-- volatile (the default): this calls random(), so it must not be marked stable even
-- though it's read-only.
as $$
  select ac.*
  from public.articles_cache ac
  where ac.lang = p_lang
    and p_category_id = any(ac.categories)
    and not exists (
      select 1 from public.swipes s
      where s.user_id = p_user_id
        and s.article_lang = p_lang
        and s.article_pageid = ac.wikipedia_pageid
    )
  order by random()
  limit p_limit;
$$;
