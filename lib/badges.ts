export interface BadgeDefinition {
  id: string;
  labelKey: string;
}

// Display order/labels only — "earned" now comes from the user_badges table (D14,
// gamification.md §5). The actual thresholds live in evaluate_and_award_badges()
// (20260919090000_user_badges.sql), the only writer to that table; keep the two in sync by
// hand if a badge is added, removed, or its condition changes.
// "First Steps" is redefined from the design canvas mockup's "opened the app" (exactly the
// kind of trivial badge CLAUDE.md's gamification guardrail warns against) to "liked your
// first article" — a real, meaningful action. Every badge here ties to genuine behaviour
// (likes, category depth, quiz accuracy, streaks, XP), never a login-streak-alone badge.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first-like', labelKey: 'profile.badges.firstLike' },
  { id: 'explorer', labelKey: 'profile.badges.explorer' },
  { id: 'curator', labelKey: 'profile.badges.curator' },
  { id: 'bookworm', labelKey: 'profile.badges.bookworm' },
  { id: 'category-master', labelKey: 'profile.badges.categoryMaster' },
  { id: 'quiz-ace', labelKey: 'profile.badges.quizAce' },
  { id: 'streak-keeper', labelKey: 'profile.badges.streakKeeper' },
  { id: 'week-streak', labelKey: 'profile.badges.weekStreak' },
  { id: 'month-streak', labelKey: 'profile.badges.monthStreak' },
  { id: 'rising-scholar', labelKey: 'profile.badges.risingScholar' },
  { id: 'scholar', labelKey: 'profile.badges.scholar' },
  { id: 'host', labelKey: 'profile.badges.host' },
  { id: 'challenger', labelKey: 'profile.badges.challenger' },
  { id: 'perfect-run', labelKey: 'profile.badges.perfectRun' },
];
