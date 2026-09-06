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
    hue: 36,
  },
  {
    id: 'arts-literature',
    slug: 'arts-literature',
    label: 'Arts & Literature',
    icon: 'color-palette-outline',
    wikipediaCategorySeed: 'Category:The arts',
    hue: 72,
  },
  {
    id: 'technology',
    slug: 'technology',
    label: 'Technology',
    icon: 'hardware-chip-outline',
    wikipediaCategorySeed: 'Category:Technology',
    hue: 108,
  },
  {
    id: 'space',
    slug: 'space',
    label: 'Space & Astronomy',
    icon: 'planet-outline',
    wikipediaCategorySeed: 'Category:Astronomy',
    hue: 144,
  },
  {
    id: 'nature',
    slug: 'nature',
    label: 'Nature & Wildlife',
    icon: 'leaf-outline',
    wikipediaCategorySeed: 'Category:Nature',
    hue: 180,
  },
  {
    id: 'geography',
    slug: 'geography',
    label: 'Geography & Places',
    icon: 'earth-outline',
    wikipediaCategorySeed: 'Category:Geography',
    hue: 216,
  },
  {
    id: 'philosophy',
    slug: 'philosophy',
    label: 'Philosophy',
    icon: 'bulb-outline',
    wikipediaCategorySeed: 'Category:Philosophy',
    hue: 252,
  },
  {
    id: 'mythology',
    slug: 'mythology',
    label: 'Mythology & Folklore',
    icon: 'flame-outline',
    wikipediaCategorySeed: 'Category:Mythology',
    hue: 288,
  },
  {
    id: 'music',
    slug: 'music',
    label: 'Music',
    icon: 'musical-notes-outline',
    wikipediaCategorySeed: 'Category:Music',
    hue: 324,
  },
];
