import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/lib/store/auth-store';
import { useServerInterestsQuery } from '@/lib/supabase/queries/user-interests';

export default function OnboardingLayout() {
  const session = useAuthStore((state) => state.session);
  const serverInterests = useServerInterestsQuery(session?.user.id);

  // Covers relaunching mid- or post-onboarding; doesn't race the imperative
  // save-then-navigate in auth.tsx, since this only trips once interests are
  // confirmed saved server-side.
  if (session && (serverInterests.data?.length ?? 0) > 0) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
