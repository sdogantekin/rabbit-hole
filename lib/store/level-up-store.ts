import { create } from 'zustand';

interface LevelUpState {
  newLevel: number | null;
  announce: (level: number | null) => void;
  dismiss: () => void;
}

// D12 (gamification.md §4): mirrors badge-celebration-store's shape. score-swipe/
// complete-quiz/complete-shared-quiz each return `newLevel` (null unless this call just
// crossed a level boundary, via check_level_up()); one global store + <LevelUpSheet/> in
// app/_layout.tsx means none of those three screens need their own copy of this UI.
export const useLevelUpStore = create<LevelUpState>((set) => ({
  newLevel: null,
  announce: (level) => {
    if (level == null) return;
    set({ newLevel: level });
  },
  dismiss: () => set({ newLevel: null }),
}));
