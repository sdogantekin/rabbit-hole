import { ScrollView, View } from 'react-native';

import { QuizHomeCard } from '@/components/quiz/QuizHomeCard';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';
import { QuizSummaryCard } from '@/components/quiz/QuizSummaryCard';
import { MIN_LIKES_TO_UNLOCK_QUIZ } from '@/constants/quiz';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { useQuizStore } from '@/lib/store/quiz-store';
import { useCompleteQuizMutation, useGenerateQuizMutation } from '@/lib/supabase/queries/quiz';
import { useSavedArticlesQuery } from '@/lib/supabase/queries/saved-articles';

export default function Quiz() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const { data: saved = [] } = useSavedArticlesQuery(userId);
  const generateQuiz = useGenerateQuizMutation();
  const completeQuiz = useCompleteQuizMutation(userId);

  const stage = useQuizStore((s) => s.stage);
  const questions = useQuizStore((s) => s.questions);
  const quizSessionId = useQuizStore((s) => s.quizSessionId);
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const selectedOptionIndex = useQuizStore((s) => s.selectedOptionIndex);
  const answered = useQuizStore((s) => s.answered);
  const answers = useQuizStore((s) => s.answers);
  const result = useQuizStore((s) => s.result);
  const startQuiz = useQuizStore((s) => s.startQuiz);
  const selectOption = useQuizStore((s) => s.selectOption);
  const advance = useQuizStore((s) => s.advance);
  const finish = useQuizStore((s) => s.finish);
  const reset = useQuizStore((s) => s.reset);

  const likedCount = saved.length;
  const isLocked = likedCount < MIN_LIKES_TO_UNLOCK_QUIZ;

  const handleStart = () => {
    generateQuiz.mutate(false, {
      onSuccess: (data) => startQuiz(data.quizSessionId, data.questions),
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.appBackground }} contentContainerStyle={{ padding: 20 }}>
      {stage === 'home' ? (
        <QuizHomeCard
          likedCount={likedCount}
          minRequired={MIN_LIKES_TO_UNLOCK_QUIZ}
          isLocked={isLocked}
          isLoading={generateQuiz.isPending}
          loadFailed={generateQuiz.isError}
          onStart={handleStart}
        />
      ) : null}

      {stage === 'active' && questions[currentIndex] ? (
        <View>
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
        </View>
      ) : null}

      {stage === 'summary' && result ? (
        <QuizSummaryCard
          score={result.score}
          totalQuestions={result.totalQuestions}
          xpAwarded={result.xpAwarded}
          onDone={reset}
        />
      ) : null}
    </ScrollView>
  );
}
