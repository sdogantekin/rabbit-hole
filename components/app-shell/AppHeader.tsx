import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { useProfileQuery } from '@/lib/supabase/queries/profile';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const { data: profile } = useProfileQuery(session?.user.id);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: colors.appBackground,
      }}
    >
      <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: colors.ink }}>rabbit hole</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 100,
          backgroundColor: colors.neutralWash,
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.ink }}>
          {profile?.streak_count ?? 0}d
        </Text>
        <View style={{ width: 1, height: 10, backgroundColor: colors.borderStrong }} />
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.ink }}>
          {profile?.discovery_score ?? 0} XP
        </Text>
      </View>
    </View>
  );
}
