import { Pressable, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

interface QuizSummaryCardProps {
  score: number;
  totalQuestions: number;
  xpAwarded: number;
  onDone: () => void;
}

export function QuizSummaryCard({ score, totalQuestions, xpAwarded, onDone }: QuizSummaryCardProps) {
  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;
  const headline =
    accuracy >= 0.8
      ? t('quiz.resultHeadline.great')
      : accuracy >= 0.5
        ? t('quiz.resultHeadline.good')
        : t('quiz.resultHeadline.keepGoing');

  return (
    <View style={styles.container}>
      <View style={styles.scoreCircle}>
        <Text style={styles.scoreText}>
          {score}/{totalQuestions}
        </Text>
      </View>
      <Text style={styles.headline}>{headline}</Text>
      <View style={styles.xpPill}>
        <Text style={styles.xpText}>{t('quiz.xpAwarded', { xp: xpAwarded })}</Text>
      </View>
      <Pressable onPress={onDone} style={styles.doneButton}>
        <Text style={styles.doneButtonText}>{t('quiz.doneCta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = {
  container: { alignItems: 'center' as const, gap: 16, paddingTop: 24 },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.neutralWashStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scoreText: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  headline: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  xpPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: colors.badgeEarnedBg,
  },
  xpText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accentStrong },
  doneButton: {
    width: '100%' as const,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center' as const,
    marginTop: 10,
  },
  doneButtonText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#fff' },
};
