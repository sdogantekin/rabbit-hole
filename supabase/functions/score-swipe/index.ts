import { createUserScopedClient } from '../_shared/supabase-client.ts';

// design.md §4 leaves these as "small"/"smaller"/"capped"/"floored" without exact values.
// Like should be felt within a session; skip is roughly 3x weaker so a handful of skips
// doesn't overcorrect a single like. Floor matches "a category never fully disappears."
const LIKE_DELTA = 0.15;
const SKIP_DELTA = -0.05;
const WEIGHT_FLOOR = 0.1;
const WEIGHT_CAP = 5.0;

Deno.serve(async (req: Request) => {
  try {
    const { pageId, lang = 'en', direction, categoryId } = await req.json();
    if (
      typeof pageId !== 'number' ||
      (direction !== 'like' && direction !== 'skip') ||
      typeof categoryId !== 'string'
    ) {
      return Response.json({ error: 'pageId, direction, and categoryId are required' }, { status: 400 });
    }

    const supabase = createUserScopedClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Idempotent: a retried submission for a swipe that already landed comes back empty
    // here (not an error), so the caller can safely retry without double-scoring.
    const { data: inserted, error: insertError } = await supabase
      .from('swipes')
      .upsert(
        { user_id: user.id, article_pageid: pageId, article_lang: lang, direction, category_id: categoryId },
        { onConflict: 'user_id,article_lang,article_pageid', ignoreDuplicates: true },
      )
      .select('id');
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }
    if (!inserted || inserted.length === 0) {
      return Response.json({ ok: true, duplicate: true });
    }

    // Never trust the client-supplied categoryId for the actual weight mutation — only
    // for the swipes log above. Re-derive the article's real category list server-side.
    const { data: article } = await supabase
      .from('articles_cache')
      .select('categories')
      .eq('lang', lang)
      .eq('wikipedia_pageid', pageId)
      .single();
    const categories = article?.categories && article.categories.length > 0 ? article.categories : [categoryId];

    const delta = direction === 'like' ? LIKE_DELTA : SKIP_DELTA;
    const weightResults = await Promise.all(
      categories.map((category) =>
        supabase.rpc('apply_interest_weight_delta', {
          p_user_id: user.id,
          p_category_id: category,
          p_delta: delta,
          p_floor: WEIGHT_FLOOR,
          p_cap: WEIGHT_CAP,
        }),
      ),
    );
    for (const result of weightResults) {
      if (result.error) console.error('apply_interest_weight_delta failed:', result.error.message);
    }

    if (direction === 'like') {
      await supabase
        .from('saved_articles')
        .upsert(
          { user_id: user.id, article_pageid: pageId, article_lang: lang },
          { onConflict: 'user_id,article_lang,article_pageid', ignoreDuplicates: true },
        );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
