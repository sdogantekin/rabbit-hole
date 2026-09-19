import { Modal, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@/constants/icons';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useLevelUpStore } from '@/lib/store/level-up-store';

// D12 (gamification.md §4): mirrors BadgeEarnedSheet — one instance mounted in
// app/_layout.tsx, driven by the level-up store so it can appear after a swipe, a quiz, or a
// shared-quiz play without any of those screens knowing about each other.
export function LevelUpSheet() {
  const newLevel = useLevelUpStore((s) => s.newLevel);
  const dismiss = useLevelUpStore((s) => s.dismiss);

  return (
    <Modal visible={newLevel != null} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.iconCircle}>
            <Ionicons name="trending-up" size={28} color={colors.ink} />
          </View>
          <Text style={styles.title}>{t('profile.levelUp.title')}</Text>
          <Text style={styles.body}>{t('profile.levelUp.body', { level: newLevel ?? 0 })}</Text>

          <Pressable onPress={dismiss} style={styles.button}>
            <Text style={styles.buttonText}>{t('profile.levelUp.cta')}</Text>
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
    gap: 12,
    alignItems: 'center' as const,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center' as const,
    marginBottom: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.badgeEarnedBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: { fontFamily: fonts.serif, fontSize: 19, color: colors.ink, textAlign: 'center' as const },
  body: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, textAlign: 'center' as const },
  button: {
    marginTop: 8,
    alignSelf: 'stretch' as const,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center' as const,
  },
  buttonText: { fontFamily: fonts.sansSemiBold, fontSize: 14.5, color: '#fff' },
};
