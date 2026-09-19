import { QUIZ_XP_PER_CORRECT_ANSWER } from '../../../constants/quiz.ts';
import { gradeAnswers } from '../_shared/quiz-grading.ts';
import { createUserScopedClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req: Request) => {
  try {
    const { quizSessionId, answers, timezone = 'UTC' } = await req.json();
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
    const { score, validAnswers } = gradeAnswers(answers, correctByQuestionId);

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

    // D6 (gamification.md §3): a quiz is a higher-effort action than a swipe, so completing
    // one keeps the streak alive too — record_daily_activity, not a plain XP increment.
    const xpAwarded = score * QUIZ_XP_PER_CORRECT_ANSWER;
    const { error: activityError } = await supabase.rpc('record_daily_activity', {
      p_user_id: user.id,
      p_xp_delta: xpAwarded,
      p_timezone: timezone,
    });
    if (activityError) console.error('record_daily_activity failed:', activityError.message);

    // D14 (gamification.md §5): re-evaluate now that this quiz's score/streak/XP are final.
    // D15: only the newly-earned ids come back, for the client's "New badge" celebration.
    const { data: newBadges, error: badgesError } = await supabase.rpc('evaluate_and_award_badges');
    if (badgesError) console.error('evaluate_and_award_badges failed:', badgesError.message);

    return Response.json({
      score,
      totalQuestions: session.total_questions,
      xpAwarded,
      newlyEarnedBadges: (newBadges ?? []).map((b) => b.awarded_badge_id),
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
