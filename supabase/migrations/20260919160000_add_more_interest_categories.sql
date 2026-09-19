-- User-researched (verified against Wikipedia's live categorymembers API — see chat):
-- these four all have rich, well-populated category trees that work well with wiki-proxy's
-- crawl (direct articles + up to 10 immediate subcategories). East Asia and a combined
-- "Science Fiction & Fantasy" were considered and dropped — Fantasy specifically because the
-- user felt people would read the label inconsistently, and a merged Sci-Fi/Fantasy category
-- doesn't map to any single Wikipedia category tree anyway (Wikipedia keeps them separate).
-- Keep in sync with constants/interest-categories.ts.
insert into public.interest_categories (id, slug, label, icon, wikipedia_category_seed) values
  ('anthropology', 'anthropology', 'Anthropology', 'people-outline', 'Category:Anthropology'),
  ('urban-legends', 'urban-legends', 'Urban Legends', 'moon-outline', 'Category:Urban legends'),
  ('science-fiction', 'science-fiction', 'Science Fiction', 'rocket-outline', 'Category:Science fiction'),
  ('pop-culture', 'pop-culture', 'Pop Culture', 'sparkles-outline', 'Category:Popular culture')
on conflict (id) do nothing;
