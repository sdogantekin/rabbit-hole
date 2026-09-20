import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SwipeControls } from '@/components/swipe-deck/SwipeControls';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/swipe-deck/SwipeDeck';
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
  const epoch = useFeedStore((state) => state.epoch);
  const setDeck = useFeedStore((state) => state.setDeck);
  const appendCards = useFeedStore((state) => state.appendCards);
  const advance = useFeedStore((state) => state.advance);

  const fetchNextBatch = useFetchNextBatchMutation();
  const submitSwipe = useSubmitSwipeMutation(session?.user.id);
  const primeArticleCache = usePrimeArticleCache();

  const [caughtUp, setCaughtUp] = useState(false);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [refillFailed, setRefillFailed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isButtonSwipePending, setIsButtonSwipePending] = useState(false);
  // Tracks the last epoch this screen loaded for, not just "have I ever loaded" — an
  // interest-change refresh bumps the store's epoch and clears the deck, and this needs to
  // re-trigger an initial load for that specific reason without also re-triggering on every
  // other empty-deck render (e.g. genuinely caught up), which is what the old plain boolean
  // guarded against.
  const lastLoadedEpoch = useRef<number | null>(null);
  const deckRef = useRef<SwipeDeckHandle>(null);

  const remainingCards = deck.slice(currentIndex);

  const loadBatch = useCallback(
    (size: number, isInitial = false) => {
      fetchNextBatch.mutate(size, {
        onSuccess: (cards) => {
          cards.forEach(primeArticleCache);
          if (isInitial) {
            setDeck(cards);
            setCaughtUp(cards.length === 0);
          } else {
            // get_unseen_articles_for_category only excludes swiped articles, not ones
            // already sitting unswiped in the local deck — for a thinly-cached category it
            // can return the same cards again, which appendCards correctly dedupes. Without
            // this check, a zero-progress refill would just retrigger the identical fetch
            // forever (the prefetch effect only stops once caughtUp is true).
            const beforeCount = useFeedStore.getState().deck.length;
            appendCards(cards);
            const afterCount = useFeedStore.getState().deck.length;
            setCaughtUp(afterCount === beforeCount);
          }
          setInitialLoadFailed(false);
          setRefillFailed(false);
        },
        onError: (err) => {
          console.error('[feed] loadBatch failed', isInitial ? 'initial' : 'refill', err);
          if (isInitial) setInitialLoadFailed(true);
          else setRefillFailed(true);
        },
      });
    },
    [fetchNextBatch, primeArticleCache, setDeck, appendCards],
  );

  useEffect(() => {
    if (lastLoadedEpoch.current !== epoch && deck.length === 0) {
      lastLoadedEpoch.current = epoch;
      loadBatch(INITIAL_BATCH_SIZE, true);
    }
  }, [epoch, deck.length, loadBatch]);

  // Prefetch-when-low: keeps swiping from ever waiting on a network call. Stops retrying on
  // refillFailed instead of hammering the same failing request forever — the empty-deck view
  // below surfaces a manual retry once that happens.
  useEffect(() => {
    if (
      lastLoadedEpoch.current !== null &&
      !caughtUp &&
      !refillFailed &&
      !fetchNextBatch.isPending &&
      remainingCards.length <= PREFETCH_THRESHOLD
    ) {
      loadBatch(REFILL_BATCH_SIZE);
    }
  }, [remainingCards.length, caughtUp, refillFailed, fetchNextBatch.isPending, loadBatch]);

  const handleSwipe = (card: FeedCard, direction: 'like' | 'skip') => {
    // Fire-and-continue: the deck advances immediately regardless of network speed
    // (requirements.md §7's smoothness target), not after the swipe round-trip completes.
    submitSwipe.mutate({ pageId: card.pageId, lang: card.lang, direction, categoryId: card.categoryId });
    setHasInteracted(true);
    setIsButtonSwipePending(false);
    advance();
  };

  const handleTapCard = (card: FeedCard) => {
    router.push(`/card/${card.pageId}`);
  };

  // Drives the same fling-off-screen animation the gesture uses, rather than swapping the
  // card instantly — SwipeDeck reports back to handleSwipe once it actually finishes, which
  // also clears isButtonSwipePending, so a second tap can't restart it mid-flight.
  const handleButtonSwipe = (direction: 'like' | 'skip') => {
    setIsButtonSwipePending(true);
    deckRef.current?.swipeTop(direction);
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
            {caughtUp ? t('feed.caughtUp') : refillFailed ? t('feed.loadError') : t('feed.refilling')}
          </Text>
          {caughtUp ? (
            <Pressable onPress={() => loadBatch(REFILL_BATCH_SIZE)} style={[styles.darkButton, { marginTop: 12 }]}>
              <Text style={styles.darkButtonText}>{t('feed.checkAgainCta')}</Text>
            </Pressable>
          ) : refillFailed ? (
            <Pressable
              onPress={() => {
                setRefillFailed(false);
                loadBatch(REFILL_BATCH_SIZE);
              }}
              style={[styles.darkButton, { marginTop: 12 }]}
            >
              <Text style={styles.darkButtonText}>{t('feed.retryCta')}</Text>
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
          ref={deckRef}
          cards={remainingCards}
          onSwipe={handleSwipe}
          onTapCard={handleTapCard}
          showHint={currentIndex === 0 && !hasInteracted}
          onInteract={() => setHasInteracted(true)}
        />
      </View>
      <SwipeControls
        onSkip={() => handleButtonSwipe('skip')}
        onLike={() => handleButtonSwipe('like')}
        disabled={isButtonSwipePending}
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
