import { useCallback } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ArticleCard } from '@/components/card/ArticleCard';
import { ArticleCardPeek } from '@/components/card/ArticleCardPeek';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import type { FeedCard } from '@/lib/supabase/queries/feed';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const VELOCITY_THRESHOLD = 800;
// Smaller than a typical tinder-clone default — design.md §8 asks for "calm curiosity,"
// not the more dramatic rotation of apps built for compulsive swiping.
const MAX_ROTATION_DEG = 8;
const VISIBLE_STACK_SIZE = 3;

type SwipeDirection = 'like' | 'skip';

interface SwipeDeckProps {
  cards: FeedCard[];
  onSwipe: (card: FeedCard, direction: SwipeDirection) => void;
  onTapCard: (card: FeedCard) => void;
  showHint: boolean;
  onInteract: () => void;
}

// Fully controlled: takes the current windowed batch of cards and reports swipes/taps up.
// Knows nothing about Supabase or TanStack Query — that stays in the screen that uses it.
export function SwipeDeck({ cards, onSwipe, onTapCard, showHint, onInteract }: SwipeDeckProps) {
  const visibleCards = cards.slice(0, VISIBLE_STACK_SIZE);

  return (
    <View style={{ flex: 1 }}>
      {visibleCards
        .map((card, stackIndex) =>
          stackIndex === 0 ? (
            <DeckCard
              key={`${card.lang}:${card.pageId}`}
              card={card}
              onSwipe={onSwipe}
              onTapCard={onTapCard}
              showHint={showHint}
              onInteract={onInteract}
            />
          ) : (
            <Animated.View
              key={`${card.lang}:${card.pageId}`}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [{ scale: 1 - stackIndex * 0.04 }, { translateY: stackIndex * 8 }],
                  opacity: stackIndex === 1 ? 0.85 : 0.6,
                },
              ]}
            >
              <ArticleCardPeek card={card} />
            </Animated.View>
          ),
        )
        // Rendered last = painted on top in RN's default stacking, so the intended top
        // card (stackIndex 0) must come last in render order.
        .reverse()}
    </View>
  );
}

interface DeckCardProps {
  card: FeedCard;
  onSwipe: (card: FeedCard, direction: SwipeDirection) => void;
  onTapCard: (card: FeedCard) => void;
  showHint: boolean;
  onInteract: () => void;
}

function DeckCard({ card, onSwipe, onTapCard, showHint, onInteract }: DeckCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const commitSwipe = useCallback(
    (direction: SwipeDirection) => onSwipe(card, direction),
    [card, onSwipe],
  );
  const commitTap = useCallback(() => onTapCard(card), [card, onTapCard]);

  const panGesture = Gesture.Pan()
    .onBegin(() => runOnJS(onInteract)())
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const committedRight = event.translationX > SWIPE_THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;
      const committedLeft = event.translationX < -SWIPE_THRESHOLD || event.velocityX < -VELOCITY_THRESHOLD;

      if (committedRight || committedLeft) {
        // Fling off-screen while immediately reporting the swipe, so the next card
        // becomes interactive without waiting on this card's exit animation to finish.
        translateX.value = withSpring(committedRight ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5);
        runOnJS(commitSwipe)(committedRight ? 'like' : 'skip');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => runOnJS(commitTap)());

  // Tap naturally fails once the pan gesture's movement exceeds its own threshold, so the
  // two coexist without fighting each other.
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 90], [0, 1], Extrapolation.CLAMP),
  }));
  const skipStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-90, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const hintOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(translateX.value), [0, 20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[StyleSheet.absoluteFill, cardAnimatedStyle]}>
        <ArticleCard card={card} />
        <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
          <Text style={[styles.stampText, { color: colors.accentStrong, borderColor: colors.accentStrong }]}>
            {t('feed.stamps.like')}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.skipStamp, skipStampStyle]}>
          <Text style={[styles.stampText, { color: colors.negative, borderColor: colors.negativeBorder }]}>
            {t('feed.stamps.skip')}
          </Text>
        </Animated.View>
        {showHint ? (
          <Animated.View style={[StyleSheet.absoluteFill, styles.hintOverlay, hintOpacityStyle]} pointerEvents="none">
            <View style={{ flexDirection: 'row', gap: 34 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={styles.hintArrow}>←</Text>
                <Text style={styles.hintLabel}>{t('feed.stamps.skip')}</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={styles.hintArrow}>→</Text>
                <Text style={styles.hintLabel}>{t('feed.stamps.like')}</Text>
              </View>
            </View>
            <Text style={styles.hintBody}>{t('feed.hint.body')}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    top: 20,
  },
  likeStamp: { left: 18, transform: [{ rotate: '-14deg' }] },
  skipStamp: { right: 18, transform: [{ rotate: '14deg' }] },
  stampText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.5,
    borderWidth: 2.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hintOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  hintArrow: { fontSize: 26, color: '#fff', fontFamily: fonts.sansBold },
  hintLabel: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.5, color: '#fff' },
  hintBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 36,
    lineHeight: 18,
  },
});
