import { createUserScopedClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req: Request) => {
  try {
    const { quizSessionId } = await req.json();
    if (typeof quizSessionId !== 'string') {
      return Response.json({ error: 'quizSessionId is required' }, { status: 400 });
    }

    const supabase = createUserScopedClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, score, total_questions, completed_at')
      .eq('id', quizSessionId)
      .eq('user_id', user.id)
      .single();
    if (sessionError || !session) {
      return Response.json({ error: 'quiz session not found' }, { status: 404 });
    }
    if (!session.completed_at) {
      return Response.json({ error: 'quiz must be completed before it can be shared' }, { status: 400 });
    }

    // Idempotent: sharing the same quiz twice reuses the same link/leaderboard instead of
    // splitting plays across two shared_quizzes rows.
    const { data: existing } = await supabase
      .from('shared_quizzes')
      .select('id')
      .eq('owner_user_id', user.id)
      .eq('source_quiz_session_id', quizSessionId)
      .maybeSingle();
    if (existing) {
      return Response.json({ sharedQuizId: existing.id });
    }

    const { data: sharedQuiz, error: shareError } = await supabase
      .from('shared_quizzes')
      .insert({ owner_user_id: user.id, source_quiz_session_id: quizSessionId })
      .select('id')
      .single();
    if (shareError || !sharedQuiz) {
      return Response.json({ error: shareError?.message ?? 'failed to create share' }, { status: 500 });
    }

    // Seed the owner's own leaderboard entry so get-shared-quiz/the leaderboard query never
    // need to special-case "the owner hasn't technically 'played' their own shared quiz."
    const { error: playError } = await supabase.from('quiz_plays').insert({
      shared_quiz_id: sharedQuiz.id,
      player_user_id: user.id,
      score: session.score,
      total_questions: session.total_questions,
    });
    if (playError) return Response.json({ error: playError.message }, { status: 500 });

    return Response.json({ sharedQuizId: sharedQuiz.id });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
