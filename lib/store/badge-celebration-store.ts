import { create } from 'zustand';

interface BadgeCelebrationState {
  pendingBadgeIds: string[];
  announce: (badgeIds: string[]) => void;
  dismiss: () => void;
}

// D15 (gamification.md §5): score-swipe/complete-quiz/complete-shared-quiz each return the
// badge ids evaluate_and_award_badges() newly awarded on that call. A single global store +
// one <BadgeEarnedSheet/> mounted in app/_layout.tsx means the three screens that can earn a
// badge (Feed, Quiz, shared-quiz play) don't each need their own copy of this UI.
export const useBadgeCelebrationStore = create<BadgeCelebrationState>((set) => ({
  pendingBadgeIds: [],
  announce: (badgeIds) => {
    if (badgeIds.length === 0) return;
    set((state) => ({ pendingBadgeIds: [...state.pendingBadgeIds, ...badgeIds] }));
  },
  dismiss: () => set({ pendingBadgeIds: [] }),
}));
