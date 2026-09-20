import '@/global.css';
// Deep-imported per weight rather than `from '@expo-google-fonts/inter'`: that package's
// index.js unconditionally requires all 18 weight/italic .ttf files as a side effect of the
// barrel export (verified in node_modules — Metro can't tree-shake requires with side
// effects), so importing the barrel bundles ~15MB of fonts this app never loads. Each
// per-weight subpath has its own index.js that requires only that one file.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SourceSerif4_400Regular } from '@expo-google-fonts/source-serif-4/400Regular';
import { SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4/600SemiBold';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsConsentSync } from '@/components/app-shell/AnalyticsConsentSync';
import { SplashScreenMimic } from '@/components/app-shell/SplashScreenMimic';
import { BadgeEarnedSheet } from '@/components/gamification/BadgeEarnedSheet';
import { LevelUpSheet } from '@/components/gamification/LevelUpSheet';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';

const queryClient = new QueryClient();

// Fonts are bundled (no network), so they're often ready almost instantly — without a floor,
// SplashScreenMimic could flash for only a few ms. This guarantees it's actually seen.
const MIN_SPLASH_DURATION_MS = 500;

SplashScreen.preventAutoHideAsync();

// The WEB client id, not the Android one — see lib/supabase/queries/auth.ts's
// signInWithGoogle comment for why. Configuring once at module load (not inside a
// component) matches Google's own setup guidance.
GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
  });
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, [setSession]);

  // Hides the native splash as soon as fonts are ready, revealing SplashScreenMimic
  // underneath — which then holds until minDurationElapsed, giving the illusion of one
  // continuous full-bleed splash rather than the OS's own brief small-icon phase.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded || !minDurationElapsed) return <SplashScreenMimic />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* animation: 'none' at this outermost level only — it governs the one-time
              handoff from SplashScreenMimic to whichever group index.tsx redirects into.
              Left as-is, the default native-stack transition (fade + slide) briefly overlaps
              the outgoing splash frame with the incoming screen's, and since the two mark
              positions differ (mimic centers the whole ring+wordmark group; intro.tsx sits
              higher to leave room for body copy and a button below), that overlap reads as
              the ring's own center visibly jumping. Nested stacks (e.g. onboarding's own
              intro -> interests -> auth) are separate navigators and keep their normal
              transitions. */}
          <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <BadgeEarnedSheet />
          <LevelUpSheet />
          <AnalyticsConsentSync />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
