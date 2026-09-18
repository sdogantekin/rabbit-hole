import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

// Reuses the exact mark + wordmark from the onboarding intro screen, on the app's own cream
// background — not a separately-designed illustration. That keeps the background color
// identical across native splash -> this -> the real app, so the only thing that visibly
// changes on each handoff is content, not a jarring color swap. See app/_layout.tsx for why
// this exists at all (Android's splash mechanisms can't render a real full-bleed image) and
// for MIN_SPLASH_DURATION_MS, which this animation is timed to finish alongside.
//
// The ring+dot mark itself is static, not animated: assets/splash-mark.png (a rendering of
// this exact same glyph, on the same background — see app.config.ts) is already on screen
// during Android's native splash phase, which this component takes over from the instant
// fonts finish loading. Animating the mark here would make it flash (visible -> invisible ->
// fading back in) at that handoff. Only the wordmark, which the native phase never shows,
// fades in — so the two phases read as one continuous screen.
export function SplashScreenMimic() {
  const wordmarkOpacity = useSharedValue(0);

  useEffect(() => {
    wordmarkOpacity.value = withTiming(1, { duration: 400 });
  }, [wordmarkOpacity]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 18 }}>
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
        <Animated.Text
          style={[
            { fontFamily: fonts.serif, fontSize: 34, letterSpacing: -0.5, color: colors.ink },
            wordmarkStyle,
          ]}
        >
          {t('onboarding.intro.title')}
        </Animated.Text>
      </View>
    </View>
  );
}
