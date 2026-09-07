import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeaderboardSheet } from '@/components/quiz/LeaderboardSheet';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';
import { QuizSummaryCard } from '@/components/quiz/QuizSummaryCard';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useQuizStore } from '@/lib/store/quiz-store';
import { useCompleteSharedQuizMutation, useSharedQuizQuery } from '@/lib/supabase/queries/shared-quiz';

export default function SharedQuiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const { data, isLoading, isError } = useSharedQuizQuery(id);
  const completeSharedQuiz = useCompleteSharedQuizMutation(userId, id);

  const stage = useQuizStore((s) => s.stage);
  const mode = useQuizStore((s) => s.mode);
  const sharedQuizId = useQuizStore((s) => s.sharedQuizId);
  const questions = useQuizStore((s) => s.questions);
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const selectedOptionIndex = useQuizStore((s) => s.selectedOptionIndex);
  const answered = useQuizStore((s) => s.answered);
  const answers = useQuizStore((s) => s.answers);
  const result = useQuizStore((s) => s.result);
  const startSharedQuiz = useQuizStore((s) => s.startSharedQuiz);
  const selectOption = useQuizStore((s) => s.selectOption);
  const advance = useQuizStore((s) => s.advance);
  const finish = useQuizStore((s) => s.finish);
  const reset = useQuizStore((s) => s.reset);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Fresh navigation to a different shared quiz than whatever the (global) store last held —
  // clear it so stale state from a previous play never bleeds into this one.
  useEffect(() => {
    if (sharedQuizId !== id) reset();
  }, [id, sharedQuizId, reset]);

  if (!session) {
    return <Redirect href="/(onboarding)/intro" />;
  }

  const goBack = () => {
    reset();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/quiz');
  };

  const handlePlay = () => {
    if (!data) return;
    startSharedQuiz(data.sharedQuizId, data.questions);
  };

  const handleNext = () => {
    const isLastQuestion = currentIndex === questions.length - 1;
    if (!isLastQuestion) {
      advance();
      return;
    }
    completeSharedQuiz.mutate(
      Object.entries(answers).map(([questionId, answerIndex]) => ({ questionId, selectedOptionIndex: answerIndex })),
      { onSuccess: (data) => finish(data) },
    );
  };

  const title = data?.ownerDisplayName
    ? t('quiz.ownerQuizTitle', { name: data.ownerDisplayName })
    : t('quiz.anonymousOwnerTitle');

  const isPlaying = mode === 'shared' && sharedQuizId === id && stage !== 'home';

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 18, marginBottom: 8 }}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.inkSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }}>
        {!isPlaying ? (
          isLoading ? (
            <Text style={styles.mutedText}>{t('sharedQuiz.loading')}</Text>
          ) : isError || !data ? (
            <Text style={styles.mutedText}>{t('sharedQuiz.loadError')}</Text>
          ) : (
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>
              {data.alreadyPlayed && data.yourResult ? (
                <>
                  <Text style={styles.body}>
                    {t('sharedQuiz.alreadyPlayedBody')} {t('quiz.scoredLabel', { score: data.yourResult.score, total: data.yourResult.totalQuestions })}
                  </Text>
                  <Pressable onPress={() => setLeaderboardOpen(true)} style={[styles.button, { backgroundColor: colors.accent }]}>
                    <Text style={styles.buttonText}>{t('quiz.viewLeaderboardCta')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.body}>{t('sharedQuiz.questionsAvailable', { count: data.questions.length })}</Text>
                  <Pressable onPress={handlePlay} style={[styles.button, { backgroundColor: colors.accent }]}>
                    <Text style={styles.buttonText}>{t('sharedQuiz.playCta')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )
        ) : null}

        {isPlaying && stage === 'active' && questions[currentIndex] ? (
          <QuizQuestionCard
            question={questions[currentIndex]}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            selectedOptionIndex={selectedOptionIndex}
            answered={answered}
            isLastQuestion={currentIndex === questions.length - 1}
            isSubmitting={completeSharedQuiz.isPending}
            onSelectOption={selectOption}
            onNext={handleNext}
          />
        ) : null}

        {isPlaying && stage === 'summary' && result ? (
          <QuizSummaryCard
            score={result.score}
            totalQuestions={result.totalQuestions}
            xpAwarded={result.xpAwarded}
            onDone={goBack}
            secondaryAction={{
              label: t('quiz.viewLeaderboardCta'),
              onPress: () => setLeaderboardOpen(true),
              variant: 'solid',
            }}
          />
        ) : null}
      </ScrollView>

      <LeaderboardSheet
        visible={leaderboardOpen}
        sharedQuizId={typeof id === 'string' ? id : undefined}
        currentUserId={userId}
        title={title}
        onClose={() => setLeaderboardOpen(false)}
      />
    </View>
  );
}

const styles = {
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  mutedText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSecondary, paddingHorizontal: 4 },
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
  body: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.inkSecondary },
  button: { padding: 14, borderRadius: 14, alignItems: 'center' as const },
  buttonText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#fff' },
};
