import { Pressable, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

interface QuizHomeCardProps {
  likedCount: number;
  minRequired: number;
  isLocked: boolean;
  isLoading: boolean;
  loadFailed: boolean;
  onStart: () => void;
}

export function QuizHomeCard({ likedCount, minRequired, isLocked, isLoading, loadFailed, onStart }: QuizHomeCardProps) {
  const statusLine = isLocked
    ? t('quiz.statusLocked', { count: likedCount })
    : t('quiz.statusReady', { count: likedCount });
  const buttonLabel = isLoading
    ? t('quiz.loading')
    : isLocked
      ? t('quiz.unlockCta', { count: Math.max(0, minRequired - likedCount) })
      : t('quiz.startCta');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('quiz.title')}</Text>
      <Text style={styles.statusLine}>{loadFailed ? t('quiz.loadError') : statusLine}</Text>
      <Pressable
        onPress={onStart}
        disabled={isLocked || isLoading}
        style={[styles.button, { backgroundColor: isLocked ? colors.neutralWashStrong : colors.accent }]}
      >
        <Text style={[styles.buttonText, { color: isLocked ? colors.inkMuted : '#fff' }]}>
          {loadFailed ? t('quiz.retryCta') : buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  statusLine: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.inkSecondary },
  button: { padding: 14, borderRadius: 14, alignItems: 'center' as const },
  buttonText: { fontFamily: fonts.sansSemiBold, fontSize: 15 },
};
