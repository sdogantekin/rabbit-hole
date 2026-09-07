import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

import type { QuizAnswerInput, QuizQuestion, QuizResult } from './quiz';

export interface SharedQuizView {
  sharedQuizId: string;
  isOwner: boolean;
  ownerDisplayName: string | null;
  alreadyPlayed: boolean;
  yourResult: { score: number; totalQuestions: number } | null;
  questions: QuizQuestion[];
}

async function fetchSharedQuiz(sharedQuizId: string): Promise<SharedQuizView> {
  const { data, error } = await supabase.functions.invoke<SharedQuizView>('get-shared-quiz', {
    body: { sharedQuizId },
  });
  if (error) throw error;
  if (!data) throw new Error('failed to load shared quiz');
  return data;
}

async function shareQuiz(quizSessionId: string): Promise<{ sharedQuizId: string }> {
  const { data, error } = await supabase.functions.invoke<{ sharedQuizId: string }>('share-quiz', {
    body: { quizSessionId },
  });
  if (error) throw error;
  if (!data) throw new Error('failed to share quiz');
  return data;
}

async function completeSharedQuiz(sharedQuizId: string, answers: QuizAnswerInput[]): Promise<QuizResult> {
  const { data, error } = await supabase.functions.invoke<QuizResult>('complete-shared-quiz', {
    body: { sharedQuizId, answers },
  });
  if (error) throw error;
  if (!data) throw new Error('failed to complete shared quiz');
  return data;
}

export function useSharedQuizQuery(sharedQuizId: string | undefined) {
  return useQuery({
    queryKey: ['shared-quiz', sharedQuizId],
    queryFn: () => fetchSharedQuiz(sharedQuizId!),
    enabled: !!sharedQuizId,
  });
}

export function useShareQuizMutation() {
  return useMutation({
    mutationFn: (quizSessionId: string) => shareQuiz(quizSessionId),
  });
}

export function useCompleteSharedQuizMutation(userId: string | undefined, sharedQuizId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: QuizAnswerInput[]) => completeSharedQuiz(sharedQuizId!, answers),
    onSuccess: () => {
      // XP just changed, and this quiz's alreadyPlayed/leaderboard state just flipped.
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['shared-quiz', sharedQuizId] });
      queryClient.invalidateQueries({ queryKey: ['shared-quiz-leaderboard', sharedQuizId] });
      queryClient.invalidateQueries({ queryKey: ['played-shared-quizzes', userId] });
    },
  });
}

export interface LeaderboardRow {
  playerUserId: string;
  score: number;
  totalQuestions: number;
  displayName: string | null;
  isYou: boolean;
}

// leaderboard_opt_in gates every name here (see the quiz_sharing_schema migration):
// get_leaderboard_display_names only returns rows for players who opted in, so anyone else
// simply doesn't come back and renders as anonymous — never an error, never their real name.
async function fetchLeaderboard(sharedQuizId: string, currentUserId: string): Promise<LeaderboardRow[]> {
  const { data: plays, error: playsError } = await supabase
    .from('quiz_plays')
    .select('player_user_id, score, total_questions')
    .eq('shared_quiz_id', sharedQuizId)
    .order('score', { ascending: false });
  if (playsError) throw playsError;
  if (!plays || plays.length === 0) return [];

  const { data: names, error: namesError } = await supabase.rpc('get_leaderboard_display_names', {
    p_user_ids: plays.map((p) => p.player_user_id),
  });
  if (namesError) throw namesError;
  const nameByUserId = new Map((names ?? []).map((n) => [n.id, n.display_name]));

  return plays.map((p) => ({
    playerUserId: p.player_user_id,
    score: p.score,
    totalQuestions: p.total_questions,
    displayName: p.player_user_id === currentUserId ? null : nameByUserId.get(p.player_user_id) ?? null,
    isYou: p.player_user_id === currentUserId,
  }));
}

export function useLeaderboardQuery(sharedQuizId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['shared-quiz-leaderboard', sharedQuizId],
    queryFn: () => fetchLeaderboard(sharedQuizId!, currentUserId!),
    enabled: !!sharedQuizId && !!currentUserId,
  });
}

export interface MySharedQuiz {
  sharedQuizId: string;
  playCount: number;
  createdAt: string;
}

// "playCount" includes the owner's own seeded entry (see share-quiz) — simplest honest
// number in a link-based model with no fixed invite list to compare against.
async function fetchMySharedQuizzes(userId: string): Promise<MySharedQuiz[]> {
  const { data: shares, error: sharesError } = await supabase
    .from('shared_quizzes')
    .select('id, created_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });
  if (sharesError) throw sharesError;
  if (!shares || shares.length === 0) return [];

  const { data: plays, error: playsError } = await supabase
    .from('quiz_plays')
    .select('shared_quiz_id')
    .in(
      'shared_quiz_id',
      shares.map((s) => s.id),
    );
  if (playsError) throw playsError;

  const countBySharedQuizId = new Map<string, number>();
  for (const play of plays ?? []) {
    countBySharedQuizId.set(play.shared_quiz_id, (countBySharedQuizId.get(play.shared_quiz_id) ?? 0) + 1);
  }

  return shares.map((s) => ({
    sharedQuizId: s.id,
    playCount: countBySharedQuizId.get(s.id) ?? 1,
    createdAt: s.created_at,
  }));
}

export function useMySharedQuizzesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-shared-quizzes', userId],
    queryFn: () => fetchMySharedQuizzes(userId!),
    enabled: !!userId,
  });
}

export interface PlayedSharedQuiz {
  sharedQuizId: string;
  ownerDisplayName: string | null;
  score: number;
  totalQuestions: number;
}

// Shared quizzes this user has played that someone else owns — deliberately excludes their
// own shared quizzes (those live in useMySharedQuizzesQuery instead).
async function fetchPlayedSharedQuizzes(userId: string): Promise<PlayedSharedQuiz[]> {
  const { data: plays, error: playsError } = await supabase
    .from('quiz_plays')
    .select('shared_quiz_id, score, total_questions')
    .eq('player_user_id', userId);
  if (playsError) throw playsError;
  if (!plays || plays.length === 0) return [];

  const { data: shares, error: sharesError } = await supabase
    .from('shared_quizzes')
    .select('id, owner_user_id')
    .in(
      'id',
      plays.map((p) => p.shared_quiz_id),
    )
    .neq('owner_user_id', userId);
  if (sharesError) throw sharesError;
  if (!shares || shares.length === 0) return [];

  const ownerIds = [...new Set(shares.map((s) => s.owner_user_id))];
  const { data: names, error: namesError } = await supabase.rpc('get_leaderboard_display_names', {
    p_user_ids: ownerIds,
  });
  if (namesError) throw namesError;
  const nameByUserId = new Map((names ?? []).map((n) => [n.id, n.display_name]));

  const shareById = new Map(shares.map((s) => [s.id, s]));
  return plays
    .map((p) => {
      const share = shareById.get(p.shared_quiz_id);
      if (!share) return null;
      return {
        sharedQuizId: p.shared_quiz_id,
        ownerDisplayName: nameByUserId.get(share.owner_user_id) ?? null,
        score: p.score,
        totalQuestions: p.total_questions,
      };
    })
    .filter((p): p is PlayedSharedQuiz => p !== null);
}

export function usePlayedSharedQuizzesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['played-shared-quizzes', userId],
    queryFn: () => fetchPlayedSharedQuizzes(userId!),
    enabled: !!userId,
  });
}
