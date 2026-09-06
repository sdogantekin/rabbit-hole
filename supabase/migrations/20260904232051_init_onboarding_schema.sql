-- Onboarding schema: profiles, curated interest categories, and per-user interest weights.
-- Everything else in design.md's data model (articles_cache, swipes, quiz_*, badges, shares)
-- belongs to later feature slices.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'en',
  is_premium boolean not null default false,
  streak_count integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  discovery_score integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Flat, hand-curated reference list (see constants/interest-categories.ts). `id` is a stable
-- human-readable text key rather than a generated UUID so it doesn't need to be kept in sync
-- with a separate mapping table.
create table public.interest_categories (
  id text primary key,
  slug text not null unique,
  label text not null,
  icon text not null,
  wikipedia_category_seed text not null
);

alter table public.interest_categories enable row level security;

create policy "interest categories are public read"
  on public.interest_categories for select
  to anon, authenticated
  using (true);

create table public.user_interests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id text not null references public.interest_categories (id) on delete cascade,
  weight real not null default 1.0,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.user_interests enable row level security;

create policy "user interests are readable by their owner"
  on public.user_interests for select
  using (auth.uid() = user_id);

create policy "user interests are insertable by their owner"
  on public.user_interests for insert
  with check (auth.uid() = user_id);

create policy "user interests are updatable by their owner"
  on public.user_interests for update
  using (auth.uid() = user_id);

create policy "user interests are deletable by their owner"
  on public.user_interests for delete
  using (auth.uid() = user_id);

-- Every new auth user gets a profiles row automatically, so the client never has to create one.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, locale) values (new.id, 'en');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep in sync with constants/interest-categories.ts.
insert into public.interest_categories (id, slug, label, icon, wikipedia_category_seed) values
  ('science', 'science', 'Science', 'flask-outline', 'Category:Science'),
  ('history', 'history', 'History', 'time-outline', 'Category:History'),
  ('arts-literature', 'arts-literature', 'Arts & Literature', 'color-palette-outline', 'Category:The arts'),
  ('technology', 'technology', 'Technology', 'hardware-chip-outline', 'Category:Technology'),
  ('space', 'space', 'Space & Astronomy', 'planet-outline', 'Category:Astronomy'),
  ('nature', 'nature', 'Nature & Wildlife', 'leaf-outline', 'Category:Nature'),
  ('geography', 'geography', 'Geography & Places', 'earth-outline', 'Category:Geography'),
  ('philosophy', 'philosophy', 'Philosophy', 'bulb-outline', 'Category:Philosophy'),
  ('mythology', 'mythology', 'Mythology & Folklore', 'flame-outline', 'Category:Mythology'),
  ('music', 'music', 'Music', 'musical-notes-outline', 'Category:Music')
on conflict (id) do nothing;
