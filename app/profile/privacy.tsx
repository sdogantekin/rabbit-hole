import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useDeleteAccountMutation, useProfileQuery, useUpdateProfileMutation } from '@/lib/supabase/queries/profile';

export default function Privacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  const { data: profile } = useProfileQuery(userId);
  const updateProfile = useUpdateProfileMutation(userId);
  const deleteAccount = useDeleteAccountMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        await supabase.auth.signOut();
        router.replace('/(onboarding)/intro');
      },
      onError: () => {
        setIsDeleting(false);
        Alert.alert(t('privacy.deleteAccountError'));
      },
    });
  };

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
        onPress={() => setConfirmOpen(true)}
        disabled={isDeleting}
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: colors.surface,
          opacity: isDeleting ? 0.6 : 1,
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14.5, color: colors.negative }}>
          {t('privacy.deleteAccountCta')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={{ padding: 16, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#fff' }}>{t('privacy.doneCta')}</Text>
      </Pressable>

      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmOpen(false)}>
          {/* On 3-button Android navigation the system bar isn't part of the OS-reserved
              layout space RN sees by default, so without this the confirm buttons rendered
              behind it, unreachable. */}
          <Pressable
            style={[styles.sheet, { paddingBottom: styles.sheet.paddingBottom + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.confirmTitle}>{t('privacy.deleteAccountConfirmTitle')}</Text>
            <Text style={styles.confirmBody}>{t('privacy.deleteAccountConfirmBody')}</Text>
            <View style={styles.confirmButtonRow}>
              <Pressable
                onPress={() => setConfirmOpen(false)}
                style={[styles.confirmButton, { backgroundColor: colors.neutralWash }]}
              >
                <Text style={[styles.confirmButtonText, { color: colors.ink }]}>
                  {t('privacy.deleteAccountCancelCta')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={[styles.confirmButton, { backgroundColor: colors.negative }]}
              >
                <Text style={[styles.confirmButtonText, { color: '#fff' }]}>
                  {t('privacy.deleteAccountConfirmCta')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' as const },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 40,
    gap: 14,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' as const },
  confirmTitle: { fontFamily: fonts.serif, fontSize: 19, color: colors.ink },
  confirmBody: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.inkMuted, lineHeight: 19 },
  confirmButtonRow: { flexDirection: 'row' as const, gap: 10, marginTop: 4 },
  confirmButton: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' as const },
  confirmButtonText: { fontFamily: fonts.sansSemiBold, fontSize: 14.5 },
};

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
