import { createUserScopedClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req: Request) => {
  try {
    const { sharedQuizId } = await req.json();
    if (typeof sharedQuizId !== 'string') {
      return Response.json({ error: 'sharedQuizId is required' }, { status: 400 });
    }

    const supabase = createUserScopedClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: sharedQuiz, error: sharedQuizError } = await supabase
      .from('shared_quizzes')
      .select('id, owner_user_id, source_quiz_session_id')
      .eq('id', sharedQuizId)
      .single();
    if (sharedQuizError || !sharedQuiz) {
      return Response.json({ error: 'shared quiz not found' }, { status: 404 });
    }

    const [{ data: questions, error: questionsError }, { data: existingPlay }, { data: ownerNames }] = await Promise.all([
      supabase
        .from('quiz_questions')
        .select('id, question_text, options, correct_option_index, question_order')
        .eq('quiz_session_id', sharedQuiz.source_quiz_session_id),
      supabase
        .from('quiz_plays')
        .select('score, total_questions')
        .eq('shared_quiz_id', sharedQuiz.id)
        .eq('player_user_id', user.id)
        .maybeSingle(),
      supabase.rpc('get_leaderboard_display_names', { p_user_ids: [sharedQuiz.owner_user_id] }),
    ]);
    if (questionsError || !questions) {
      return Response.json({ error: questionsError?.message ?? 'quiz questions not found' }, { status: 500 });
    }

    const ordered = [...questions].sort((a, b) => a.question_order - b.question_order);

    return Response.json({
      sharedQuizId: sharedQuiz.id,
      isOwner: sharedQuiz.owner_user_id === user.id,
      ownerDisplayName: ownerNames?.[0]?.display_name ?? null,
      alreadyPlayed: !!existingPlay,
      yourResult: existingPlay ? { score: existingPlay.score, totalQuestions: existingPlay.total_questions } : null,
      questions: ordered.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        options: q.options,
        correctOptionIndex: q.correct_option_index,
      })),
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
