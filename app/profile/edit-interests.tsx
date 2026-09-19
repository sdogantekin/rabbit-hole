import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { InterestSelectionForm } from '@/components/interests/InterestSelectionForm';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useSaveInterestsMutation, useServerInterestsQuery } from '@/lib/supabase/queries/user-interests';

export default function EditInterests() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  const { data: currentSlugs, isLoading } = useServerInterestsQuery(userId);
  const saveInterests = useSaveInterestsMutation(userId);

  const handleSubmit = async (slugs: string[]) => {
    await saveInterests.mutateAsync(slugs);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: 64 }}>
      <Text
        style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginBottom: 16, paddingHorizontal: 24 }}
      >
        {t('editInterests.title')}
      </Text>
      {isLoading || !currentSlugs ? (
        // InterestSelectionForm captures its selection into useState once, at mount — it
        // must not mount before the real server list has arrived, or it freezes on an empty
        // selection and hitting Save would wipe every category the user actually has.
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, paddingHorizontal: 24 }}>
          {t('editInterests.loading')}
        </Text>
      ) : (
        <InterestSelectionForm
          initialSelected={currentSlugs}
          onSubmit={handleSubmit}
          submitLabel={t('editInterests.saveCta')}
        />
      )}
    </View>
  );
}
