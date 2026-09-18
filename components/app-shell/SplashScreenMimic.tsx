import { View } from 'react-native';

import { colors } from '@/constants/theme';

// Ring-only, static, no wordmark and no animation — deliberately identical to
// assets/splash-mark.png (the native Android splash image, see app.config.ts), so this
// component is visually indistinguishable from the native phase it takes over from once
// fonts finish loading. An earlier version added a fading-in wordmark here, which made this
// read as its own distinct "second screen" against the real destination (the onboarding
// intro screen, which has the wordmark plus body copy and a button) — see app/_layout.tsx
// for MIN_SPLASH_DURATION_MS, which this holds for.
export function SplashScreenMimic() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, alignItems: 'center', justifyContent: 'center' }}>
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
    </View>
  );
}
