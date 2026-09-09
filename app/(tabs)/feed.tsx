import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SwipeControls } from '@/components/swipe-deck/SwipeControls';
import { SwipeDeck } from '@/components/swipe-deck/SwipeDeck';
import { INITIAL_BATCH_SIZE, PREFETCH_THRESHOLD, REFILL_BATCH_SIZE } from '@/constants/feed';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useFeedStore } from '@/lib/store/feed-store';
import {
  useFetchNextBatchMutation,
  usePrimeArticleCache,
  useSubmitSwipeMutation,
  type FeedCard,
} from '@/lib/supabase/queries/feed';

export default function Feed() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const deck = useFeedStore((state) => state.deck);
  const currentIndex = useFeedStore((state) => state.currentIndex);
  const setDeck = useFeedStore((state) => state.setDeck);
  const appendCards = useFeedStore((state) => state.appendCards);
  const advance = useFeedStore((state) => state.advance);

  const fetchNextBatch = useFetchNextBatchMutation();
  const submitSwipe = useSubmitSwipeMutation(session?.user.id);
  const primeArticleCache = usePrimeArticleCache();

  const [caughtUp, setCaughtUp] = useState(false);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const hasLoadedOnce = useRef(false);

  const remainingCards = deck.slice(currentIndex);

  const loadBatch = useCallback(
    (size: number, isInitial = false) => {
      fetchNextBatch.mutate(size, {
        onSuccess: (cards) => {
          cards.forEach(primeArticleCache);
          if (isInitial) setDeck(cards);
          else appendCards(cards);
          setCaughtUp(cards.length === 0);
          setInitialLoadFailed(false);
        },
        onError: () => {
          if (isInitial) setInitialLoadFailed(true);
        },
      });
    },
    [fetchNextBatch, primeArticleCache, setDeck, appendCards],
  );

  useEffect(() => {
    if (!hasLoadedOnce.current && deck.length === 0) {
      hasLoadedOnce.current = true;
      loadBatch(INITIAL_BATCH_SIZE, true);
    }
  }, [deck.length, loadBatch]);

  // Prefetch-when-low: keeps swiping from ever waiting on a network call.
  useEffect(() => {
    if (
      hasLoadedOnce.current &&
      !caughtUp &&
      !fetchNextBatch.isPending &&
      remainingCards.length <= PREFETCH_THRESHOLD
    ) {
      loadBatch(REFILL_BATCH_SIZE);
    }
  }, [remainingCards.length, caughtUp, fetchNextBatch.isPending, loadBatch]);

  const handleSwipe = (card: FeedCard, direction: 'like' | 'skip') => {
    // Fire-and-continue: the deck advances immediately regardless of network speed
    // (requirements.md §7's smoothness target), not after the swipe round-trip completes.
    submitSwipe.mutate({ pageId: card.pageId, lang: card.lang, direction, categoryId: card.categoryId });
    setHasInteracted(true);
    advance();
  };

  const handleTapCard = (card: FeedCard) => {
    router.push(`/card/${card.pageId}`);
  };

  if (deck.length === 0 && fetchNextBatch.isPending) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.mutedText}>{t('feed.loading')}</Text>
      </View>
    );
  }

  if (initialLoadFailed) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={[styles.mutedText, { marginBottom: 16 }]}>{t('feed.loadError')}</Text>
        <Pressable onPress={() => loadBatch(INITIAL_BATCH_SIZE, true)} style={styles.darkButton}>
          <Text style={styles.darkButtonText}>{t('feed.retryCta')}</Text>
        </Pressable>
      </View>
    );
  }

  if (remainingCards.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBackground, padding: 20 }}>
        <View style={styles.emptyCard}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 19, color: colors.ink, marginBottom: 8 }}>
            {caughtUp ? t('feed.caughtUp') : t('feed.refilling')}
          </Text>
          {caughtUp ? (
            <Pressable onPress={() => loadBatch(REFILL_BATCH_SIZE)} style={[styles.darkButton, { marginTop: 12 }]}>
              <Text style={styles.darkButtonText}>{t('feed.checkAgainCta')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: 8 }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <SwipeDeck
          cards={remainingCards}
          onSwipe={handleSwipe}
          onTapCard={handleTapCard}
          showHint={currentIndex === 0 && !hasInteracted}
          onInteract={() => setHasInteracted(true)}
        />
      </View>
      <SwipeControls
        onSkip={() => handleSwipe(remainingCards[0], 'skip')}
        onLike={() => handleSwipe(remainingCards[0], 'like')}
      />
    </View>
  );
}

const styles = {
  centeredScreen: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.appBackground,
    paddingHorizontal: 24,
  },
  mutedText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSecondary },
  darkButton: { borderRadius: 100, backgroundColor: colors.ink, paddingHorizontal: 24, paddingVertical: 12 },
  darkButtonText: { fontFamily: fonts.sansSemiBold, color: '#fff' },
  emptyCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
};
