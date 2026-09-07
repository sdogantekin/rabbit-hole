import { QUIZ_XP_PER_CORRECT_ANSWER } from '../../../constants/quiz.ts';
import { gradeAnswers } from '../_shared/quiz-grading.ts';
import { createUserScopedClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req: Request) => {
  try {
    const { sharedQuizId, answers } = await req.json();
    if (typeof sharedQuizId !== 'string' || !Array.isArray(answers)) {
      return Response.json({ error: 'sharedQuizId and answers are required' }, { status: 400 });
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
      .select('id, source_quiz_session_id')
      .eq('id', sharedQuizId)
      .single();
    if (sharedQuizError || !sharedQuiz) {
      return Response.json({ error: 'shared quiz not found' }, { status: 404 });
    }

    // Idempotent: a retried/duplicate play returns the existing result instead of grading
    // again and double-awarding XP — same principle as complete-quiz, enforced here by the
    // (shared_quiz_id, player_user_id) unique constraint on quiz_plays.
    const { data: existingPlay } = await supabase
      .from('quiz_plays')
      .select('score, total_questions')
      .eq('shared_quiz_id', sharedQuiz.id)
      .eq('player_user_id', user.id)
      .maybeSingle();
    if (existingPlay) {
      return Response.json({ score: existingPlay.score, totalQuestions: existingPlay.total_questions, xpAwarded: 0 });
    }

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, correct_option_index')
      .eq('quiz_session_id', sharedQuiz.source_quiz_session_id);
    if (questionsError || !questions || questions.length === 0) {
      return Response.json({ error: questionsError?.message ?? 'quiz questions not found' }, { status: 500 });
    }

    // Never trust a client-supplied score — always regrade from the original owner's answer
    // key. Unlike complete-quiz, this never writes user_answer_index on the source
    // quiz_questions rows — those belong only to the original owner's own playthrough.
    const correctByQuestionId = new Map(questions.map((q) => [q.id, q.correct_option_index]));
    const { score } = gradeAnswers(answers, correctByQuestionId);

    const { error: insertError } = await supabase.from('quiz_plays').insert({
      shared_quiz_id: sharedQuiz.id,
      player_user_id: user.id,
      score,
      total_questions: questions.length,
    });
    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

    const xpAwarded = score * QUIZ_XP_PER_CORRECT_ANSWER;
    const { error: xpError } = await supabase.rpc('increment_discovery_score', {
      p_user_id: user.id,
      p_delta: xpAwarded,
    });
    if (xpError) console.error('increment_discovery_score failed:', xpError.message);

    return Response.json({ score, totalQuestions: questions.length, xpAwarded });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
