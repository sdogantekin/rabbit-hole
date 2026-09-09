import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

export interface FeedCard {
  pageId: number;
  lang: string;
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
  categoryId: string;
}

interface SubmitSwipeInput {
  pageId: number;
  lang?: string;
  direction: 'like' | 'skip';
  categoryId: string;
}

async function fetchNextBatch(batchSize: number): Promise<FeedCard[]> {
  const { data, error } = await supabase.functions.invoke<{ cards: FeedCard[] }>('get-feed', {
    body: { batchSize },
  });
  if (error) throw error;
  return data?.cards ?? [];
}

async function submitSwipe(input: SubmitSwipeInput): Promise<void> {
  const { error } = await supabase.functions.invoke('score-swipe', { body: input });
  if (error) throw error;
}

async function fetchArticleFromCache(pageId: number, lang: string) {
  const { data, error } = await supabase
    .from('articles_cache')
    .select('*')
    .eq('wikipedia_pageid', pageId)
    .eq('lang', lang)
    .single();
  if (error) throw error;
  return data;
}

// get-feed is a non-idempotent read (its result depends on ever-growing swipe history) —
// modeled as a mutation rather than a query so nothing ever serves a cached/stale batch.
export function useFetchNextBatchMutation() {
  return useMutation({
    mutationFn: (batchSize: number) => fetchNextBatch(batchSize),
  });
}

// Streak/XP just changed server-side (score-swipe now calls record_swipe_activity on every
// swipe) — invalidate so the header's streak/XP badge picks it up without a manual refresh.
export function useSubmitSwipeMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitSwipeInput) => submitSwipe(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function articleCacheQueryKey(pageId: number, lang: string) {
  return ['article-cache', lang, pageId] as const;
}

// A genuine cacheable GET, unlike the batch fetch above — used by the reader view. Primed
// from the feed screen right after each batch fetch so tapping a card is instant.
export function useArticleCacheQuery(pageId: number, lang = 'en') {
  return useQuery({
    queryKey: articleCacheQueryKey(pageId, lang),
    queryFn: () => fetchArticleFromCache(pageId, lang),
  });
}

export function usePrimeArticleCache() {
  const queryClient = useQueryClient();
  return (card: FeedCard) => {
    queryClient.setQueryData(articleCacheQueryKey(card.pageId, card.lang), {
      wikipedia_pageid: card.pageId,
      lang: card.lang,
      title: card.title,
      extract: card.extract,
      thumbnail_url: card.thumbnailUrl,
      source_url: card.sourceUrl,
      categories: [card.categoryId],
      cached_at: new Date().toISOString(),
      ttl_expires_at: new Date().toISOString(),
    });
  };
}
