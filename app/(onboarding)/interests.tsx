import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { InterestSelectionForm } from '@/components/interests/InterestSelectionForm';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useOnboardingStore } from '@/lib/store/onboarding-store';
import { useSaveInterestsMutation } from '@/lib/supabase/queries/user-interests';

export default function Interests() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const selectedCategorySlugs = useOnboardingStore((state) => state.selectedCategorySlugs);
  const setSelectedCategorySlugs = useOnboardingStore((state) => state.setSelectedCategorySlugs);
  const saveInterests = useSaveInterestsMutation(session?.user.id);

  const handleSubmit = async (slugs: string[]) => {
    if (!session) {
      // No account yet: hold the selection locally and ask for one next.
      setSelectedCategorySlugs(slugs);
      router.push('/(onboarding)/auth');
      return;
    }
    // Returning user resuming onboarding after already signing in.
    await saveInterests.mutateAsync(slugs);
    router.replace('/(tabs)/feed');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: 64 }}>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 26,
          color: colors.ink,
          marginBottom: 6,
          paddingHorizontal: 24,
        }}
      >
        {t('onboarding.interests.title')}
      </Text>
      <InterestSelectionForm
        initialSelected={selectedCategorySlugs}
        onSubmit={handleSubmit}
        submitLabel={t('onboarding.interests.cta')}
      />
    </View>
  );
}
