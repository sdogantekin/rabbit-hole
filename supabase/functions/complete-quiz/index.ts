import { QUIZ_XP_PER_CORRECT_ANSWER } from '../../../constants/quiz.ts';
import { createUserScopedClient } from '../_shared/supabase-client.ts';

interface SubmittedAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

function isSubmittedAnswer(value: unknown): value is SubmittedAnswer {
  const record = value as Record<string, unknown> | null;
  return (
    typeof record === 'object' &&
    record !== null &&
    typeof record.questionId === 'string' &&
    typeof record.selectedOptionIndex === 'number'
  );
}

Deno.serve(async (req: Request) => {
  try {
    const { quizSessionId, answers } = await req.json();
    if (typeof quizSessionId !== 'string' || !Array.isArray(answers)) {
      return Response.json({ error: 'quizSessionId and answers are required' }, { status: 400 });
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
      .select('id, total_questions, score, completed_at')
      .eq('id', quizSessionId)
      .eq('user_id', user.id)
      .single();
    if (sessionError || !session) {
      return Response.json({ error: 'quiz session not found' }, { status: 404 });
    }

    // Idempotent: a retried completion returns the already-scored result instead of
    // re-grading and double-awarding XP (same shape as score-swipe's duplicate handling).
    if (session.completed_at) {
      return Response.json({ score: session.score, totalQuestions: session.total_questions, xpAwarded: 0 });
    }

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, correct_option_index')
      .eq('quiz_session_id', session.id);
    if (questionsError || !questions) {
      return Response.json({ error: questionsError?.message ?? 'quiz questions not found' }, { status: 500 });
    }

    // Never trust a client-supplied score — always regrade from the stored answer key, the
    // same "re-derive server-side" principle score-swipe applies to swipe categories.
    const correctByQuestionId = new Map(questions.map((q) => [q.id, q.correct_option_index]));
    const validAnswers = (answers as unknown[])
      .filter(isSubmittedAnswer)
      .filter((answer) => correctByQuestionId.has(answer.questionId));

    const score = validAnswers.filter(
      (answer) => correctByQuestionId.get(answer.questionId) === answer.selectedOptionIndex,
    ).length;

    await Promise.all(
      validAnswers.map((answer) =>
        supabase.from('quiz_questions').update({ user_answer_index: answer.selectedOptionIndex }).eq('id', answer.questionId),
      ),
    );

    const { error: updateError } = await supabase
      .from('quiz_sessions')
      .update({ score, completed_at: new Date().toISOString() })
      .eq('id', session.id);
    if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

    const xpAwarded = score * QUIZ_XP_PER_CORRECT_ANSWER;
    const { error: xpError } = await supabase.rpc('increment_discovery_score', {
      p_user_id: user.id,
      p_delta: xpAwarded,
    });
    if (xpError) console.error('increment_discovery_score failed:', xpError.message);

    return Response.json({ score, totalQuestions: session.total_questions, xpAwarded });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
