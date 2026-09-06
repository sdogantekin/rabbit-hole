import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useProfileQuery, useUpdateProfileMutation } from '@/lib/supabase/queries/profile';

export default function Privacy() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  const { data: profile } = useProfileQuery(userId);
  const updateProfile = useUpdateProfileMutation(userId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: 64, paddingHorizontal: 24, gap: 18 }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink }}>{t('privacy.title')}</Text>

      <View style={{ borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden' }}>
        <ToggleRow
          label={t('privacy.analyticsLabel')}
          body={t('privacy.analyticsBody')}
          value={profile?.analytics_opt_in ?? true}
          onToggle={() => updateProfile.mutate({ analytics_opt_in: !(profile?.analytics_opt_in ?? true) })}
          showBorder
        />
        <ToggleRow
          label={t('privacy.leaderboardLabel')}
          body={t('privacy.leaderboardBody')}
          value={profile?.leaderboard_opt_in ?? false}
          onToggle={() => updateProfile.mutate({ leaderboard_opt_in: !(profile?.leaderboard_opt_in ?? false) })}
        />
      </View>

      <Pressable
        onPress={() => router.back()}
        style={{ padding: 16, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#fff' }}>{t('privacy.doneCta')}</Text>
      </Pressable>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  body: string;
  value: boolean;
  onToggle: () => void;
  showBorder?: boolean;
}

function ToggleRow({ label, body, value, onToggle, showBorder }: ToggleRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: colors.neutralWash,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink }}>{label}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkMuted, marginTop: 2 }}>{body}</Text>
      </View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        style={{
          width: 44,
          height: 26,
          borderRadius: 100,
          backgroundColor: value ? colors.accent : colors.neutralWashStrong,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#fff',
            marginLeft: value ? 20 : 2,
          }}
        />
      </Pressable>
    </View>
  );
}
