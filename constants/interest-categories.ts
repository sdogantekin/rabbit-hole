export interface InterestCategory {
  /** Matches interest_categories.id in Postgres (text PK, equal to slug for v1). */
  id: string;
  slug: string;
  label: string;
  /** Ionicons name, bundled with Expo. */
  icon: string;
  wikipediaCategorySeed: string;
  /** Hue (degrees) for the accent/tint pair in constants/theme.ts — evenly spaced. */
  hue: number;
}

export const MIN_INTEREST_SELECTION = 3;

// Shared between the client (lib/supabase/queries/user-interests.ts) and score-swipe —
// design.md §4's "floor" (a category never fully disappears) and "cap" on interest weight.
// A fresh category starts at BASELINE_WEIGHT; apply_interest_weight_delta nudges it up/down
// per swipe within [WEIGHT_FLOOR, WEIGHT_CAP].
export const WEIGHT_FLOOR = 0.1;
export const WEIGHT_CAP = 5.0;
export const BASELINE_WEIGHT = 1.0;

// Curated, not auto-generated from raw Wikipedia categories (see CLAUDE.md).
// Keep this in sync with supabase/migrations/20260904232051_init_onboarding_schema.sql and
// supabase/migrations/20260918120000_add_interest_categories.sql.
// Hues are recomputed evenly across the full list any time a category is added or removed
// (currently 360/18 = 20° apart) — not appended ad hoc — to keep the accent/tint spread even.
export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: 'science',
    slug: 'science',
    label: 'Science',
    icon: 'flask-outline',
    wikipediaCategorySeed: 'Category:Science',
    hue: 0,
  },
  {
    id: 'history',
    slug: 'history',
    label: 'History',
    icon: 'time-outline',
    wikipediaCategorySeed: 'Category:History',
    hue: 20,
  },
  {
    id: 'arts-literature',
    slug: 'arts-literature',
    label: 'Arts & Literature',
    icon: 'color-palette-outline',
    wikipediaCategorySeed: 'Category:The arts',
    hue: 40,
  },
  {
    id: 'technology',
    slug: 'technology',
    label: 'Technology',
    icon: 'hardware-chip-outline',
    wikipediaCategorySeed: 'Category:Technology',
    hue: 60,
  },
  {
    id: 'space',
    slug: 'space',
    label: 'Space & Astronomy',
    icon: 'planet-outline',
    wikipediaCategorySeed: 'Category:Astronomy',
    hue: 80,
  },
  {
    id: 'nature',
    slug: 'nature',
    label: 'Nature & Wildlife',
    icon: 'leaf-outline',
    wikipediaCategorySeed: 'Category:Nature',
    hue: 100,
  },
  {
    id: 'geography',
    slug: 'geography',
    label: 'Geography & Places',
    icon: 'earth-outline',
    wikipediaCategorySeed: 'Category:Geography',
    hue: 120,
  },
  {
    id: 'philosophy',
    slug: 'philosophy',
    label: 'Philosophy',
    icon: 'bulb-outline',
    wikipediaCategorySeed: 'Category:Philosophy',
    hue: 140,
  },
  {
    id: 'anthropology',
    slug: 'anthropology',
    label: 'Anthropology',
    icon: 'people-outline',
    wikipediaCategorySeed: 'Category:Anthropology',
    hue: 160,
  },
  {
    id: 'mythology',
    slug: 'mythology',
    label: 'Mythology & Folklore',
    icon: 'flame-outline',
    wikipediaCategorySeed: 'Category:Mythology',
    hue: 180,
  },
  {
    id: 'urban-legends',
    slug: 'urban-legends',
    label: 'Urban Legends',
    icon: 'moon-outline',
    wikipediaCategorySeed: 'Category:Urban legends',
    hue: 200,
  },
  {
    id: 'music',
    slug: 'music',
    label: 'Music',
    icon: 'musical-notes-outline',
    wikipediaCategorySeed: 'Category:Music',
    hue: 220,
  },
  {
    id: 'sports',
    slug: 'sports',
    label: 'Sports',
    icon: 'football-outline',
    wikipediaCategorySeed: 'Category:Sports',
    hue: 240,
  },
  {
    id: 'film-television',
    slug: 'film-television',
    label: 'Film & Television',
    icon: 'film-outline',
    wikipediaCategorySeed: 'Category:Film',
    hue: 260,
  },
  {
    id: 'science-fiction',
    slug: 'science-fiction',
    label: 'Science Fiction',
    icon: 'rocket-outline',
    wikipediaCategorySeed: 'Category:Science fiction',
    hue: 280,
  },
  {
    id: 'pop-culture',
    slug: 'pop-culture',
    label: 'Pop Culture',
    icon: 'sparkles-outline',
    wikipediaCategorySeed: 'Category:Popular culture',
    hue: 300,
  },
  {
    id: 'food-drink',
    slug: 'food-drink',
    label: 'Food & Drink',
    icon: 'restaurant-outline',
    wikipediaCategorySeed: 'Category:Food and drink',
    hue: 320,
  },
  {
    id: 'health-medicine',
    slug: 'health-medicine',
    label: 'Health & Medicine',
    icon: 'medkit-outline',
    wikipediaCategorySeed: 'Category:Medicine',
    hue: 340,
  },
];
