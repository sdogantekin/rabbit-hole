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

// Curated, not auto-generated from raw Wikipedia categories (see CLAUDE.md).
// Keep this in sync with supabase/migrations/20260904232051_init_onboarding_schema.sql.
// Hues are recomputed evenly across the full list any time a category is added or removed
// (currently 360/14 ≈ 26° apart) — not appended ad hoc — to keep the accent/tint spread even.
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
    hue: 26,
  },
  {
    id: 'arts-literature',
    slug: 'arts-literature',
    label: 'Arts & Literature',
    icon: 'color-palette-outline',
    wikipediaCategorySeed: 'Category:The arts',
    hue: 51,
  },
  {
    id: 'technology',
    slug: 'technology',
    label: 'Technology',
    icon: 'hardware-chip-outline',
    wikipediaCategorySeed: 'Category:Technology',
    hue: 77,
  },
  {
    id: 'space',
    slug: 'space',
    label: 'Space & Astronomy',
    icon: 'planet-outline',
    wikipediaCategorySeed: 'Category:Astronomy',
    hue: 103,
  },
  {
    id: 'nature',
    slug: 'nature',
    label: 'Nature & Wildlife',
    icon: 'leaf-outline',
    wikipediaCategorySeed: 'Category:Nature',
    hue: 129,
  },
  {
    id: 'geography',
    slug: 'geography',
    label: 'Geography & Places',
    icon: 'earth-outline',
    wikipediaCategorySeed: 'Category:Geography',
    hue: 154,
  },
  {
    id: 'philosophy',
    slug: 'philosophy',
    label: 'Philosophy',
    icon: 'bulb-outline',
    wikipediaCategorySeed: 'Category:Philosophy',
    hue: 180,
  },
  {
    id: 'mythology',
    slug: 'mythology',
    label: 'Mythology & Folklore',
    icon: 'flame-outline',
    wikipediaCategorySeed: 'Category:Mythology',
    hue: 206,
  },
  {
    id: 'music',
    slug: 'music',
    label: 'Music',
    icon: 'musical-notes-outline',
    wikipediaCategorySeed: 'Category:Music',
    hue: 231,
  },
  {
    id: 'sports',
    slug: 'sports',
    label: 'Sports',
    icon: 'football-outline',
    wikipediaCategorySeed: 'Category:Sports',
    hue: 257,
  },
  {
    id: 'film-television',
    slug: 'film-television',
    label: 'Film & Television',
    icon: 'film-outline',
    wikipediaCategorySeed: 'Category:Film',
    hue: 283,
  },
  {
    id: 'food-drink',
    slug: 'food-drink',
    label: 'Food & Drink',
    icon: 'restaurant-outline',
    wikipediaCategorySeed: 'Category:Food and drink',
    hue: 309,
  },
  {
    id: 'health-medicine',
    slug: 'health-medicine',
    label: 'Health & Medicine',
    icon: 'medkit-outline',
    wikipediaCategorySeed: 'Category:Medicine',
    hue: 334,
  },
];
