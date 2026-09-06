import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/auth-store';

export default function Index() {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <View style={{ flex: 1, backgroundColor: colors.appBackground }} />;
  }

  // The (onboarding) layout redirects onward to the feed if the user already has a
  // session and saved interests, so this is the single entry point either way.
  return <Redirect href="/(onboarding)/intro" />;
}
