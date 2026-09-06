import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { discoverCandidateArticles, fetchArticleSummary } from './wikimedia.ts';

const CACHE_TTL_DAYS = 21;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

Deno.serve(async (req: Request) => {
  try {
    const { categoryId, count } = await req.json();
    if (typeof categoryId !== 'string' || typeof count !== 'number') {
      return Response.json({ error: 'categoryId and count are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: category, error: categoryError } = await supabase
      .from('interest_categories')
      .select('wikipedia_category_seed')
      .eq('id', categoryId)
      .single();
    if (categoryError || !category) {
      return Response.json({ error: 'unknown categoryId' }, { status: 400 });
    }

    const candidates = await discoverCandidateArticles(category.wikipedia_category_seed);
    const candidateIds = candidates.map((c) => c.pageid);

    const { data: existingRows } = await supabase
      .from('articles_cache')
      .select('*')
      .eq('lang', 'en')
      .in('wikipedia_pageid', candidateIds.length > 0 ? candidateIds : [-1]);
    const existingByPageId = new Map((existingRows ?? []).map((row) => [row.wikipedia_pageid, row]));

    const ttlExpiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const rowsToUpsert: Array<{
      wikipedia_pageid: number;
      lang: string;
      title: string;
      extract: string;
      thumbnail_url: string | null;
      source_url: string;
      categories: string[];
      cached_at: string;
      ttl_expires_at: string;
    }> = [];

    const uncachedCandidates: typeof candidates = [];
    for (const candidate of candidates) {
      const existing = existingByPageId.get(candidate.pageid);
      if (!existing) {
        uncachedCandidates.push(candidate);
        continue;
      }
      // Already cached — if this crawl found it under a category it isn't tagged with yet,
      // add the tag (no need to re-fetch content that's already cached).
      if (!existing.categories.includes(categoryId)) {
        rowsToUpsert.push({
          ...existing,
          categories: [...existing.categories, categoryId],
          cached_at: new Date().toISOString(),
          ttl_expires_at: ttlExpiresAt,
        });
      }
    }

    // Bound external HTTP calls to roughly what was asked for.
    const toFetch = shuffle(uncachedCandidates).slice(0, count);
    const summaries = await Promise.all(toFetch.map((c) => fetchArticleSummary(c.title)));
    for (const summary of summaries) {
      if (!summary) continue;
      rowsToUpsert.push({
        wikipedia_pageid: summary.pageid,
        lang: 'en',
        title: summary.title,
        extract: summary.extract,
        thumbnail_url: summary.thumbnailUrl,
        source_url: summary.sourceUrl,
        categories: [categoryId],
        cached_at: new Date().toISOString(),
        ttl_expires_at: ttlExpiresAt,
      });
    }

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('articles_cache')
        .upsert(rowsToUpsert, { onConflict: 'lang,wikipedia_pageid' });
      if (upsertError) {
        return Response.json({ error: upsertError.message }, { status: 500 });
      }
    }

    return Response.json({ articlesAdded: rowsToUpsert.length });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
