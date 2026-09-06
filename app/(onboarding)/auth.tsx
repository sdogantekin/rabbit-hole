import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmailOtpForm } from '@/components/auth/EmailOtpForm';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useOnboardingStore } from '@/lib/store/onboarding-store';
import { supabase } from '@/lib/supabase/client';
import { signInAsGuest } from '@/lib/supabase/queries/auth';
import { saveUserInterests } from '@/lib/supabase/queries/user-interests';

export default function Auth() {
  const router = useRouter();
  const selectedCategorySlugs = useOnboardingStore((state) => state.selectedCategorySlugs);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  // Shared by both the email-verified callback and the guest button: whichever way the
  // user ends up with a session, saving the pending interests and moving on is identical.
  const finishOnboarding = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (userId) {
      await saveUserInterests(userId, selectedCategorySlugs);
    }
    resetOnboarding();
    router.replace('/(tabs)/feed');
  };

  const handleGuest = async () => {
    setIsGuestSubmitting(true);
    try {
      await signInAsGuest();
      await finishOnboarding();
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: 64 }}>
      <Text
        style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginBottom: 6, paddingHorizontal: 24 }}
      >
        {t('onboarding.auth.title')}
      </Text>
      <Text
        style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkSecondary, marginBottom: 24, paddingHorizontal: 24 }}
      >
        {t('onboarding.auth.body')}
      </Text>
      <EmailOtpForm onVerified={finishOnboarding} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 24 }}>
        <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            textTransform: 'uppercase',
            color: colors.inkFaint,
            marginHorizontal: 12,
          }}
        >
          {t('onboarding.auth.guestDivider')}
        </Text>
        <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
      </View>
      <View style={{ paddingHorizontal: 24 }}>
        <Pressable
          onPress={handleGuest}
          disabled={isGuestSubmitting}
          style={{
            alignItems: 'center',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.border,
            paddingVertical: 16,
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink }}>
            {isGuestSubmitting ? '…' : t('onboarding.auth.guestCta')}
          </Text>
        </Pressable>
        <Text
          style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 12 }}
        >
          {t('onboarding.auth.guestDisclaimer')}
        </Text>
      </View>
    </View>
  );
}
