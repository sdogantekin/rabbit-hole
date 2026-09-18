import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { useServerInterestsQuery } from '@/lib/supabase/queries/user-interests';

export default function OnboardingLayout() {
  const session = useAuthStore((state) => state.session);
  const serverInterests = useServerInterestsQuery(session?.user.id);

  // While a signed-in user's interests are still being fetched, we don't yet know whether
  // to redirect to the feed — rendering the Stack here would flash the intro screen (with
  // its body copy and "Get started" button) for a returning, already-onboarded user before
  // the redirect below kicks in. Hold on a blank matching background instead.
  if (session && serverInterests.isPending) {
    return <View style={{ flex: 1, backgroundColor: colors.appBackground }} />;
  }

  // Covers relaunching mid- or post-onboarding; doesn't race the imperative
  // save-then-navigate in auth.tsx, since this only trips once interests are
  // confirmed saved server-side.
  if (session && (serverInterests.data?.length ?? 0) > 0) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
