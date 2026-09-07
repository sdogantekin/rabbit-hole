import { Pressable, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import type { QuizQuestion } from '@/lib/supabase/queries/quiz';

interface QuizQuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionIndex: number | null;
  answered: boolean;
  isLastQuestion: boolean;
  isSubmitting: boolean;
  onSelectOption: (index: number) => void;
  onNext: () => void;
}

export function QuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionIndex,
  answered,
  isLastQuestion,
  isSubmitting,
  onSelectOption,
  onNext,
}: QuizQuestionCardProps) {
  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: totalQuestions }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= questionNumber - 1 ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>

      <Text style={styles.counter}>{t('quiz.questionCounter', { current: questionNumber, total: totalQuestions })}</Text>
      <Text style={styles.prompt}>{question.questionText}</Text>

      <View style={{ gap: 10 }}>
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctOptionIndex;
          const isSelected = index === selectedOptionIndex;
          let borderColor: string = colors.border;
          let backgroundColor: string = colors.surface;
          let textColor: string = colors.ink;
          if (answered) {
            if (isCorrect) {
              borderColor = colors.quizCorrectBorder;
              backgroundColor = colors.quizCorrectBg;
              textColor = colors.quizCorrectText;
            } else if (isSelected) {
              borderColor = colors.quizIncorrectBorder;
              backgroundColor = colors.quizIncorrectBg;
              textColor = colors.quizIncorrectText;
            }
          }

          return (
            <Pressable
              key={index}
              onPress={() => onSelectOption(index)}
              disabled={answered}
              style={[styles.option, { borderColor, backgroundColor }]}
            >
              <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <Pressable onPress={onNext} disabled={isSubmitting} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>
            {isSubmitting ? t('quiz.submitting') : isLastQuestion ? t('quiz.seeResultsCta') : t('quiz.nextCta')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = {
  counter: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.inkSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  prompt: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: colors.ink },
  option: { padding: 14, borderRadius: 14, borderWidth: 1.5 },
  optionText: { fontFamily: fonts.sans, fontSize: 14 },
  nextButton: { padding: 14, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center' as const },
  nextButtonText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#fff' },
};
