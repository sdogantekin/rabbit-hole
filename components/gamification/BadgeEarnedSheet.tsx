import { Image, Modal, Pressable, Text, View } from 'react-native';

import { BADGE_ICONS } from '@/constants/badge-icons';
import { Ionicons } from '@/constants/icons';
import { colors, fonts } from '@/constants/theme';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import { t } from '@/lib/localization';
import { useBadgeCelebrationStore } from '@/lib/store/badge-celebration-store';

// D15 (gamification.md §5): "a small bottom sheet after the action that earned it, never a
// blocking modal mid-swipe" — mounted once in app/_layout.tsx, driven entirely by the
// badge-celebration store so it can pop up after a swipe, a quiz, or a shared-quiz play
// without any of those screens knowing about each other.
export function BadgeEarnedSheet() {
  const pendingBadgeIds = useBadgeCelebrationStore((s) => s.pendingBadgeIds);
  const dismiss = useBadgeCelebrationStore((s) => s.dismiss);

  const badges = pendingBadgeIds
    .map((id) => BADGE_DEFINITIONS.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => b != null);

  return (
    <Modal visible={badges.length > 0} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('profile.badgeEarned.title')}</Text>

          <View style={{ gap: 10 }}>
            {badges.map((badge) => (
              <View key={badge.id} style={styles.row}>
                <View style={styles.iconCircle}>
                  {BADGE_ICONS[badge.id] ? (
                    <Image source={BADGE_ICONS[badge.id]} style={styles.icon} resizeMode="contain" />
                  ) : (
                    <Ionicons name="ribbon-outline" size={22} color={colors.ink} />
                  )}
                </View>
                <Text style={styles.label}>{t(badge.labelKey)}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={dismiss} style={styles.button}>
            <Text style={styles.buttonText}>{t('profile.badgeEarned.cta')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
    gap: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' as const },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, textAlign: 'center' as const },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: colors.badgeEarnedBg,
    borderRadius: 14,
    padding: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  icon: { width: 26, height: 26 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  button: { padding: 14, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center' as const },
  buttonText: { fontFamily: fonts.sansSemiBold, fontSize: 14.5, color: '#fff' },
};
