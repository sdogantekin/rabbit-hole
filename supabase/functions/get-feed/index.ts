import { createUserScopedClient } from '../_shared/supabase-client.ts';
import {
  pickExplorationCategories,
  shuffle,
  tallyByCategory,
  weightedSampleCategory,
  type CategoryWeight,
} from './sampling.ts';

const DEFAULT_BATCH_SIZE = 15;
const EXPLORATION_SHARE = 0.1;
const BACKFILL_BUFFER = 5;

Deno.serve(async (req: Request) => {
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const batchSize: number = typeof body.batchSize === 'number' ? body.batchSize : DEFAULT_BATCH_SIZE;

    const supabase = createUserScopedClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const [{ data: userInterests }, { data: allCategories }] = await Promise.all([
      supabase.from('user_interests').select('category_id, weight').eq('user_id', user.id),
      supabase.from('interest_categories').select('id'),
    ]);

    const userWeights: CategoryWeight[] = (userInterests ?? []).map((row) => ({
      categoryId: row.category_id,
      weight: row.weight,
    }));
    const allCategoryIds = (allCategories ?? []).map((row) => row.id);

    const explorationCount = Math.max(1, Math.round(batchSize * EXPLORATION_SHARE));
    const personalizedCount = batchSize - explorationCount;

    // Defensive fallback: onboarding enforces MIN_INTEREST_SELECTION, so this shouldn't
    // normally happen, but a brand-new user_interests-less account shouldn't 500.
    const weightsForSampling = userWeights.length > 0
      ? userWeights
      : allCategoryIds.map((categoryId) => ({ categoryId, weight: 1 }));

    const personalizedPicks = Array.from({ length: personalizedCount }, () =>
      weightedSampleCategory(weightsForSampling),
    );
    const explorationPicks = pickExplorationCategories(weightsForSampling, allCategoryIds, explorationCount);

    const tally = tallyByCategory([...personalizedPicks, ...explorationPicks]);

    const resultsByCategory = await Promise.all(
      [...tally.entries()].map(async ([categoryId, neededCount]) => {
        let { data: rows } = await supabase.rpc('get_unseen_articles_for_category', {
          p_user_id: user.id,
          p_category_id: categoryId,
          p_lang: 'en',
          p_limit: neededCount,
        });
        rows ??= [];

        if (rows.length < neededCount) {
          const shortfall = neededCount - rows.length;
          await supabase.functions.invoke('wiki-proxy', {
            body: { categoryId, count: shortfall + BACKFILL_BUFFER },
          });
          const { data: refilledRows } = await supabase.rpc('get_unseen_articles_for_category', {
            p_user_id: user.id,
            p_category_id: categoryId,
            p_lang: 'en',
            p_limit: neededCount,
          });
          rows = refilledRows ?? rows;
        }

        return rows.map((row) => ({ ...row, drawnForCategory: categoryId }));
      }),
    );

    const seen = new Set<string>();
    const cards = [];
    for (const row of shuffle(resultsByCategory.flat())) {
      const key = `${row.lang}:${row.wikipedia_pageid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        pageId: row.wikipedia_pageid,
        lang: row.lang,
        title: row.title,
        extract: row.extract,
        thumbnailUrl: row.thumbnail_url,
        sourceUrl: row.source_url,
        categoryId: row.drawnForCategory,
      });
    }

    return Response.json({ cards });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
