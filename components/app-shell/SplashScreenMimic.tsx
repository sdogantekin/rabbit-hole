import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

// Reuses the exact mark + wordmark from the onboarding intro screen, on the app's own cream
// background — not a separately-designed illustration. That keeps the background color
// identical across native splash -> this -> the real app, so the only thing that visibly
// changes on each handoff is content, not a jarring color swap. See app/_layout.tsx for why
// this exists at all (Android's splash mechanisms can't render a real full-bleed image) and
// for MIN_SPLASH_DURATION_MS, which this animation is timed to finish alongside.
export function SplashScreenMimic() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 500 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ alignItems: 'center', gap: 18 }, animatedStyle]}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.appBackground,
            borderWidth: 2,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
          </View>
        </View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 34, letterSpacing: -0.5, color: colors.ink }}>
          {t('onboarding.intro.title')}
        </Text>
      </Animated.View>
    </View>
  );
}
