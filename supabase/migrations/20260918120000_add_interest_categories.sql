-- Keep in sync with constants/interest-categories.ts.
insert into public.interest_categories (id, slug, label, icon, wikipedia_category_seed) values
  ('sports', 'sports', 'Sports', 'football-outline', 'Category:Sports'),
  ('film-television', 'film-television', 'Film & Television', 'film-outline', 'Category:Film'),
  ('food-drink', 'food-drink', 'Food & Drink', 'restaurant-outline', 'Category:Food and drink'),
  ('health-medicine', 'health-medicine', 'Health & Medicine', 'medkit-outline', 'Category:Medicine')
on conflict (id) do nothing;
