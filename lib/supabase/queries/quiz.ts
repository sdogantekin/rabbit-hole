import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

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
    body: { quizSessionId, answers },
  });
  if (error) throw error;
  if (!data) throw new Error('failed to complete quiz');
  return data;
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
  return useMutation({
    mutationFn: ({ quizSessionId, answers }: { quizSessionId: string; answers: QuizAnswerInput[] }) =>
      completeQuiz(quizSessionId, answers),
    onSuccess: () => {
      // XP just changed server-side; refresh the profile stats and the quiz-accuracy badge.
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['latest-quiz-result', userId] });
    },
  });
}

async function fetchLatestQuizAccuracy(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('score, total_questions')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.total_questions === 0) return null;
  return data.score / data.total_questions;
}

// Powers the "Quiz Ace" badge (lib/badges.ts) — deferred until quiz mode existed, per its
// original comment.
export function useLatestQuizAccuracyQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['latest-quiz-result', userId],
    queryFn: () => fetchLatestQuizAccuracy(userId!),
    enabled: !!userId,
  });
}
