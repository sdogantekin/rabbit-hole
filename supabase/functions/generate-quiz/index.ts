import { MAX_ARTICLES_FOR_QUIZ, MAX_QUESTIONS_PER_QUIZ, MIN_LIKES_TO_UNLOCK_QUIZ } from '../../../constants/quiz.ts';
import { createUserScopedClient } from '../_shared/supabase-client.ts';
import { createLLMProvider, type GeneratedQuizQuestion, type QuizQuestionInput } from '../_shared/llm/provider.ts';
import { validateGeneratedQuestions } from './validate.ts';

async function tryGenerate(
  providerName: string,
  inputs: QuizQuestionInput[],
  allowedPageIds: Set<number>,
): Promise<GeneratedQuizQuestion[] | null> {
  try {
    const provider = createLLMProvider(providerName);
    const raw = await provider.generateQuizQuestions(inputs);
    return validateGeneratedQuestions(raw, allowedPageIds);
  } catch (err) {
    console.error(`generate-quiz provider "${providerName}" failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const reshuffle = body.reshuffle === true;

    const supabase = createUserScopedClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: saved, error: savedError } = await supabase
      .from('saved_articles')
      .select('article_pageid, article_lang')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .limit(MAX_ARTICLES_FOR_QUIZ);
    if (savedError) return Response.json({ error: savedError.message }, { status: 500 });

    const likedCount = saved?.length ?? 0;
    if (likedCount < MIN_LIKES_TO_UNLOCK_QUIZ) {
      return Response.json(
        { error: 'not_enough_likes', likedCount, minRequired: MIN_LIKES_TO_UNLOCK_QUIZ },
        { status: 400 },
      );
    }

    const pool = saved!.slice(0, Math.min(likedCount, MAX_QUESTIONS_PER_QUIZ));
    const articleSetKey = pool
      .map((row) => `${row.article_lang}:${row.article_pageid}`)
      .sort()
      .join(',');

    // Serve back an in-progress quiz for the same article set instead of regenerating, per
    // design.md §5 — unless the caller explicitly wants a fresh shuffle.
    if (!reshuffle) {
      const { data: existingSession } = await supabase
        .from('quiz_sessions')
        .select('id, total_questions')
        .eq('user_id', user.id)
        .eq('article_set_key', articleSetKey)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        const { data: existingQuestions, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('id, question_text, options, correct_option_index, question_order')
          .eq('quiz_session_id', existingSession.id);
        if (questionsError) return Response.json({ error: questionsError.message }, { status: 500 });

        if (existingQuestions && existingQuestions.length === existingSession.total_questions) {
          const ordered = [...existingQuestions].sort((a, b) => a.question_order - b.question_order);
          return Response.json({
            quizSessionId: existingSession.id,
            questions: ordered.map((q) => ({
              id: q.id,
              questionText: q.question_text,
              options: q.options,
              correctOptionIndex: q.correct_option_index,
            })),
          });
        }
      }
    }

    const { data: articles, error: articlesError } = await supabase
      .from('articles_cache')
      .select('wikipedia_pageid, lang, title, extract')
      .in('wikipedia_pageid', pool.map((row) => row.article_pageid));
    if (articlesError) return Response.json({ error: articlesError.message }, { status: 500 });

    const inputs: QuizQuestionInput[] = pool
      .map((row) => articles?.find((a) => a.wikipedia_pageid === row.article_pageid && a.lang === row.article_lang))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ pageId: a.wikipedia_pageid, title: a.title, extract: a.extract }));

    if (inputs.length === 0) {
      return Response.json({ error: 'no cached article content available for quiz generation' }, { status: 500 });
    }

    const allowedPageIds = new Set(inputs.map((a) => a.pageId));
    const providerName = Deno.env.get('LLM_PROVIDER') ?? 'anthropic';

    // design.md §5.1: one retry on the configured provider, then a hard fallback to
    // Anthropic — availability matters more than which model answered a retry.
    let questions = await tryGenerate(providerName, inputs, allowedPageIds);
    if (!questions) questions = await tryGenerate(providerName, inputs, allowedPageIds);
    if (!questions && providerName !== 'anthropic') questions = await tryGenerate('anthropic', inputs, allowedPageIds);

    if (!questions) {
      return Response.json({ error: 'failed to generate a valid quiz' }, { status: 502 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({ user_id: user.id, total_questions: questions.length, article_set_key: articleSetKey })
      .select('id')
      .single();
    if (sessionError || !session) {
      return Response.json({ error: sessionError?.message ?? 'failed to create quiz session' }, { status: 500 });
    }

    const questionRows = questions.map((q, index) => ({
      quiz_session_id: session.id,
      article_pageid: q.pageId,
      article_lang: pool.find((row) => row.article_pageid === q.pageId)?.article_lang ?? 'en',
      question_text: q.questionText,
      options: q.options,
      correct_option_index: q.correctOptionIndex,
      question_order: index,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(questionRows)
      .select('id, question_text, options, correct_option_index, question_order');
    if (insertError || !insertedQuestions) {
      return Response.json({ error: insertError?.message ?? 'failed to save quiz questions' }, { status: 500 });
    }

    const ordered = [...insertedQuestions].sort((a, b) => a.question_order - b.question_order);
    return Response.json({
      quizSessionId: session.id,
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
