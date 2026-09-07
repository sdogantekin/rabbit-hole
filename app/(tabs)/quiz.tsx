import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';

import { LeaderboardSheet } from '@/components/quiz/LeaderboardSheet';
import { QuizHomeCard } from '@/components/quiz/QuizHomeCard';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';
import { QuizSummaryCard } from '@/components/quiz/QuizSummaryCard';
import { MIN_LIKES_TO_UNLOCK_QUIZ } from '@/constants/quiz';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useQuizStore } from '@/lib/store/quiz-store';
import { useCompleteQuizMutation, useGenerateQuizMutation } from '@/lib/supabase/queries/quiz';
import { useSavedArticlesQuery } from '@/lib/supabase/queries/saved-articles';
import {
  useMySharedQuizzesQuery,
  usePlayedSharedQuizzesQuery,
  useShareQuizMutation,
} from '@/lib/supabase/queries/shared-quiz';

interface LeaderboardTarget {
  sharedQuizId: string;
  title: string;
}

export default function Quiz() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const { data: saved = [] } = useSavedArticlesQuery(userId);
  const { data: mySharedQuizzes = [] } = useMySharedQuizzesQuery(userId);
  const { data: playedSharedQuizzes = [] } = usePlayedSharedQuizzesQuery(userId);
  const generateQuiz = useGenerateQuizMutation();
  const completeQuiz = useCompleteQuizMutation(userId);
  const shareQuiz = useShareQuizMutation();

  const stage = useQuizStore((s) => s.stage);
  const mode = useQuizStore((s) => s.mode);
  const questions = useQuizStore((s) => s.questions);
  const quizSessionId = useQuizStore((s) => s.quizSessionId);
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const selectedOptionIndex = useQuizStore((s) => s.selectedOptionIndex);
  const answered = useQuizStore((s) => s.answered);
  const answers = useQuizStore((s) => s.answers);
  const result = useQuizStore((s) => s.result);
  const startOwnQuiz = useQuizStore((s) => s.startOwnQuiz);
  const selectOption = useQuizStore((s) => s.selectOption);
  const advance = useQuizStore((s) => s.advance);
  const finish = useQuizStore((s) => s.finish);
  const reset = useQuizStore((s) => s.reset);

  // A shared quiz is always started from the /shared-quiz/[id] route, not here — but the
  // store is global, so if the user switches back to this tab mid-shared-quiz, fall back to
  // the home content here rather than rendering the wrong screen's active/summary state.
  const showHomeContent = stage === 'home' || mode !== 'own';

  const [leaderboardTarget, setLeaderboardTarget] = useState<LeaderboardTarget | null>(null);

  const likedCount = saved.length;
  const isLocked = likedCount < MIN_LIKES_TO_UNLOCK_QUIZ;

  const handleStart = () => {
    generateQuiz.mutate(false, {
      onSuccess: (data) => startOwnQuiz(data.quizSessionId, data.questions),
    });
  };

  const handleNext = () => {
    const isLastQuestion = currentIndex === questions.length - 1;
    if (!isLastQuestion) {
      advance();
      return;
    }
    if (!quizSessionId) return;
    completeQuiz.mutate(
      {
        quizSessionId,
        answers: Object.entries(answers).map(([questionId, answerIndex]) => ({
          questionId,
          selectedOptionIndex: answerIndex,
        })),
      },
      { onSuccess: (data) => finish(data) },
    );
  };

  const handleShare = () => {
    if (!quizSessionId) return;
    shareQuiz.mutate(quizSessionId, {
      onSuccess: async ({ sharedQuizId }) => {
        const url = Linking.createURL(`/shared-quiz/${sharedQuizId}`);
        const message = t('quiz.shareMessage', {
          score: result?.score ?? 0,
          total: result?.totalQuestions ?? 0,
        });
        try {
          await Share.share({ message: `${message} ${url}` });
        } catch {
          // user dismissed the native share sheet — not an error
        }
      },
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.appBackground }} contentContainerStyle={{ padding: 20, gap: 22 }}>
      {showHomeContent ? (
        <>
          <QuizHomeCard
            likedCount={likedCount}
            minRequired={MIN_LIKES_TO_UNLOCK_QUIZ}
            isLocked={isLocked}
            isLoading={generateQuiz.isPending}
            loadFailed={generateQuiz.isError}
            onStart={handleStart}
          />

          {mySharedQuizzes.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>{t('quiz.yourSharedQuizzesTitle')}</Text>
              <View style={{ gap: 8 }}>
                {mySharedQuizzes.map((sq) => (
                  <Pressable
                    key={sq.sharedQuizId}
                    onPress={() => setLeaderboardTarget({ sharedQuizId: sq.sharedQuizId, title: t('quiz.ownQuizTitle') })}
                    style={styles.listRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{t('quiz.ownQuizTitle')}</Text>
                      <Text style={styles.listRowSubtitle}>{t('quiz.playsCountLabel', { count: sq.playCount })}</Text>
                    </View>
                    <Text style={styles.listRowCta}>{t('quiz.leaderboardCta')}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {playedSharedQuizzes.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>{t('quiz.playedTitle')}</Text>
              <View style={{ gap: 8 }}>
                {playedSharedQuizzes.map((pq) => {
                  const title = pq.ownerDisplayName
                    ? t('quiz.ownerQuizTitle', { name: pq.ownerDisplayName })
                    : t('quiz.anonymousOwnerTitle');
                  const fromLabel = pq.ownerDisplayName
                    ? t('quiz.fromLabel', { name: pq.ownerDisplayName })
                    : t('quiz.fromAnonymousLabel');
                  return (
                    <Pressable
                      key={pq.sharedQuizId}
                      onPress={() => setLeaderboardTarget({ sharedQuizId: pq.sharedQuizId, title })}
                      style={styles.listRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle}>{title}</Text>
                        <Text style={styles.listRowSubtitle}>
                          {fromLabel} — {t('quiz.scoredLabel', { score: pq.score, total: pq.totalQuestions })}
                        </Text>
                      </View>
                      <Text style={styles.listRowCta}>{t('quiz.leaderboardCta')}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {stage === 'active' && mode === 'own' && questions[currentIndex] ? (
        <QuizQuestionCard
          question={questions[currentIndex]}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          selectedOptionIndex={selectedOptionIndex}
          answered={answered}
          isLastQuestion={currentIndex === questions.length - 1}
          isSubmitting={completeQuiz.isPending}
          onSelectOption={selectOption}
          onNext={handleNext}
        />
      ) : null}

      {stage === 'summary' && mode === 'own' && result ? (
        <QuizSummaryCard
          score={result.score}
          totalQuestions={result.totalQuestions}
          xpAwarded={result.xpAwarded}
          onDone={reset}
          secondaryAction={{
            label: shareQuiz.isPending ? t('quiz.sharing') : t('quiz.shareCta'),
            onPress: handleShare,
            variant: 'outline',
            disabled: shareQuiz.isPending,
          }}
        />
      ) : null}

      <LeaderboardSheet
        visible={!!leaderboardTarget}
        sharedQuizId={leaderboardTarget?.sharedQuizId}
        currentUserId={userId}
        title={leaderboardTarget?.title ?? ''}
        onClose={() => setLeaderboardTarget(null)}
      />
    </ScrollView>
  );
}

const styles = {
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink, marginBottom: 10 },
  listRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  listRowTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  listRowSubtitle: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  listRowCta: { fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: colors.accentStrong },
};
