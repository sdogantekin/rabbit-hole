import type { ImageSourcePropType } from 'react-native';

// Metro needs static `require(...)` calls to resolve image assets — a dynamic path built
// from a badge id wouldn't bundle, hence this explicit id -> asset map (cropped from the
// hand-drawn reference sheet in assets/badges/, one file per badge).
//
// host/challenger/perfect-run (D16, gamification.md §5) don't have hand-drawn art yet —
// deliberately left out of this map rather than blocked on it; profile.tsx falls back to a
// generic Ionicons glyph for any badge id missing here. Add real artwork by filling in the
// entry, no other change needed.
export const BADGE_ICONS: Partial<Record<string, ImageSourcePropType>> = {
  'first-like': require('../assets/badges/first-like.png'),
  explorer: require('../assets/badges/explorer.png'),
  curator: require('../assets/badges/curator.png'),
  bookworm: require('../assets/badges/bookworm.png'),
  'category-master': require('../assets/badges/category-master.png'),
  'quiz-ace': require('../assets/badges/quiz-ace.png'),
  'streak-keeper': require('../assets/badges/streak-keeper.png'),
  'week-streak': require('../assets/badges/week-streak.png'),
  'month-streak': require('../assets/badges/month-streak.png'),
  'rising-scholar': require('../assets/badges/rising-scholar.png'),
  scholar: require('../assets/badges/scholar.png'),
};
