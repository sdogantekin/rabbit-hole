import { create } from 'zustand';

import type { FeedCard } from '@/lib/supabase/queries/feed';

interface FeedState {
  deck: FeedCard[];
  currentIndex: number;
  setDeck: (cards: FeedCard[]) => void;
  appendCards: (cards: FeedCard[]) => void;
  advance: () => void;
  reset: () => void;
}

// Deck array + index only — no scoring/business logic lives here (that's server-side, see
// the get-feed/score-swipe Edge Functions). Deliberately not persisted: the deck is
// ephemeral session state, consistent with this slice being online-only.
export const useFeedStore = create<FeedState>((set) => ({
  deck: [],
  currentIndex: 0,
  setDeck: (cards) => set({ deck: cards, currentIndex: 0 }),
  appendCards: (cards) =>
    set((state) => {
      const existingKeys = new Set(state.deck.map((c) => `${c.lang}:${c.pageId}`));
      const newCards = cards.filter((c) => !existingKeys.has(`${c.lang}:${c.pageId}`));
      return { deck: [...state.deck, ...newCards] };
    }),
  advance: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
  reset: () => set({ deck: [], currentIndex: 0 }),
}));
