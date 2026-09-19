import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { useBadgeCelebrationStore } from '@/lib/store/badge-celebration-store';
import { useLevelUpStore } from '@/lib/store/level-up-store';
import { getLocalTimezone } from '@/lib/timezone';

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  // Included so the UI can give instant right/wrong feedback per question — see the
  // RLS comment in the quiz_schema migration for why that's an accepted v1 tradeoff.
  correctOptionIndex: number;
}

export interface GeneratedQuiz {
  quizSessionId: string;
  questions: QuizQuestion[];
}

export interface QuizAnswerInput {
  questionId: string;
  selectedOptionIndex: number;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  xpAwarded: number;
  newlyEarnedBadges: string[];
  newLevel: number | null;
}

// Thrown from generate-quiz when the user hasn't liked enough articles yet — a normal,
// expected outcome for the Quiz tab's locked state, not a real error.
export class NotEnoughLikesError extends Error {
  constructor(public likedCount: number, public minRequired: number) {
    super('not_enough_likes');
  }
}

async function generateQuiz(reshuffle: boolean): Promise<GeneratedQuiz> {
  const { data, error } = await supabase.functions.invoke<GeneratedQuiz>('generate-quiz', { body: { reshuffle } });
  if (error) {
    // On a non-2xx response, supabase-js puts the raw Response on error.context instead of
    // populating `data` — this is the only way to recover generate-quiz's structured
    // 400 body (error/likedCount/minRequired) for the "not enough likes yet" locked state.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.error === 'not_enough_likes') {
        throw new NotEnoughLikesError(body.likedCount ?? 0, body.minRequired ?? 0);
      }
    }
    throw error;
  }
  if (!data) throw new Error('failed to generate quiz');
  return data;
}

async function completeQuiz(quizSessionId: string, answers: QuizAnswerInput[]): Promise<QuizResult> {
  const { data, error } = await supabase.functions.invoke<QuizResult>('complete-quiz', {
    body: { quizSessionId, answers, timezone: getLocalTimezone() },
  });
  if (error) throw error;
  if (!data) throw new Error('failed to complete quiz');
  return { ...data, newlyEarnedBadges: data.newlyEarnedBadges ?? [], newLevel: data.newLevel ?? null };
}

// Not idempotent (may create a new quiz_sessions row) and its result depends on ever-growing
// like history, so this is a mutation, same reasoning as useFetchNextBatchMutation.
export function useGenerateQuizMutation() {
  return useMutation({
    mutationFn: (reshuffle: boolean) => generateQuiz(reshuffle),
  });
}

export function useCompleteQuizMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  const announceBadges = useBadgeCelebrationStore((s) => s.announce);
  const announceLevelUp = useLevelUpStore((s) => s.announce);
  return useMutation({
    mutationFn: ({ quizSessionId, answers }: { quizSessionId: string; answers: QuizAnswerInput[] }) =>
      completeQuiz(quizSessionId, answers),
    onSuccess: ({ newlyEarnedBadges, newLevel }) => {
      // XP/streak just changed server-side, and evaluate_and_award_badges may have earned
      // new ones (D14, gamification.md §5).
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['earned-badges', userId] });
      announceBadges(newlyEarnedBadges);
      announceLevelUp(newLevel);
    },
  });
}
