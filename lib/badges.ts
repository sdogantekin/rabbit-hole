import type { SavedArticle } from '@/lib/supabase/queries/saved-articles';

export interface BadgeStats {
  saved: SavedArticle[];
  lastQuizAccuracy: number | null;
  streakCount: number;
  discoveryScore: number;
}

export interface BadgeDefinition {
  id: string;
  labelKey: string;
  isEarned: (stats: BadgeStats) => boolean;
}

// Category-mastery threshold is lower than the overall "Curator" count (design.md §6: a
// mastery badge is about depth in one topic, not just total volume).
const CATEGORY_MASTERY_THRESHOLD = 8;

function maxCategoryLikeCount(saved: SavedArticle[]): number {
  const counts = new Map<string, number>();
  for (const category of saved.flatMap((a) => a.categories)) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts.size > 0 ? Math.max(...counts.values()) : 0;
}

// Computed live from real data — no badges/user_badges tables exist yet
// (requirements.md's iteration plan puts the full badges/achievements system in v2).
// "First Steps" is redefined from the design canvas mockup's "opened the app" (exactly the
// kind of trivial badge CLAUDE.md's gamification guardrail warns against) to "liked your
// first article" — a real, meaningful action. Every badge here ties to genuine behavior
// (likes, category depth, quiz accuracy, streaks, XP), never a login-streak-alone badge.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-like',
    labelKey: 'profile.badges.firstLike',
    isEarned: ({ saved }) => saved.length >= 1,
  },
  {
    id: 'explorer',
    labelKey: 'profile.badges.explorer',
    isEarned: ({ saved }) => new Set(saved.flatMap((a) => a.categories)).size >= 5,
  },
  {
    id: 'curator',
    labelKey: 'profile.badges.curator',
    isEarned: ({ saved }) => saved.length >= 10,
  },
  {
    id: 'bookworm',
    labelKey: 'profile.badges.bookworm',
    isEarned: ({ saved }) => saved.length >= 25,
  },
  {
    id: 'category-master',
    labelKey: 'profile.badges.categoryMaster',
    isEarned: ({ saved }) => maxCategoryLikeCount(saved) >= CATEGORY_MASTERY_THRESHOLD,
  },
  {
    id: 'quiz-ace',
    labelKey: 'profile.badges.quizAce',
    isEarned: ({ lastQuizAccuracy }) => (lastQuizAccuracy ?? 0) >= 0.8,
  },
  {
    id: 'streak-keeper',
    labelKey: 'profile.badges.streakKeeper',
    isEarned: ({ streakCount }) => streakCount >= 3,
  },
  {
    id: 'week-streak',
    labelKey: 'profile.badges.weekStreak',
    isEarned: ({ streakCount }) => streakCount >= 7,
  },
  {
    id: 'month-streak',
    labelKey: 'profile.badges.monthStreak',
    isEarned: ({ streakCount }) => streakCount >= 30,
  },
  {
    id: 'rising-scholar',
    labelKey: 'profile.badges.risingScholar',
    isEarned: ({ discoveryScore }) => discoveryScore >= 100,
  },
  {
    id: 'scholar',
    labelKey: 'profile.badges.scholar',
    isEarned: ({ discoveryScore }) => discoveryScore >= 500,
  },
];
