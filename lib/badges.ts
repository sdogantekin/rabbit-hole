import type { SavedArticle } from '@/lib/supabase/queries/saved-articles';

export interface BadgeDefinition {
  id: string;
  labelKey: string;
  isEarned: (saved: SavedArticle[], lastQuizAccuracy: number | null) => boolean;
}

// Computed live from real data — no badges/user_badges tables exist yet
// (requirements.md's iteration plan puts the full badges/achievements system in v2).
// "First Steps" is redefined from the design canvas mockup's "opened the app" (exactly the
// kind of trivial badge CLAUDE.md's gamification guardrail warns against) to "liked your
// first article" — a real, meaningful action.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-like',
    labelKey: 'profile.badges.firstLike',
    isEarned: (saved) => saved.length >= 1,
  },
  {
    id: 'explorer',
    labelKey: 'profile.badges.explorer',
    isEarned: (saved) => new Set(saved.flatMap((a) => a.categories)).size >= 5,
  },
  {
    id: 'curator',
    labelKey: 'profile.badges.curator',
    isEarned: (saved) => saved.length >= 10,
  },
  {
    id: 'quiz-ace',
    labelKey: 'profile.badges.quizAce',
    isEarned: (_saved, lastQuizAccuracy) => (lastQuizAccuracy ?? 0) >= 0.8,
  },
];
