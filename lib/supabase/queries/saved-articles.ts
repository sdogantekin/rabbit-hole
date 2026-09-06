import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

export interface SavedArticle {
  pageId: number;
  lang: string;
  title: string;
  categories: string[];
  savedAt: string;
}

// No FK between saved_articles and articles_cache (see design.md §2 — they're independent
// tables), so PostgREST can't embed one in the other; fetch saved rows, then look up the
// matching cached articles and join in JS.
async function fetchSavedArticles(userId: string): Promise<SavedArticle[]> {
  const { data: saved, error: savedError } = await supabase
    .from('saved_articles')
    .select('article_pageid, article_lang, saved_at')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (savedError) throw savedError;
  if (!saved || saved.length === 0) return [];

  const pageIds = saved.map((row) => row.article_pageid);
  const { data: articles, error: articlesError } = await supabase
    .from('articles_cache')
    .select('wikipedia_pageid, lang, title, categories')
    .in('wikipedia_pageid', pageIds);
  if (articlesError) throw articlesError;

  const byPageId = new Map((articles ?? []).map((a) => [a.wikipedia_pageid, a]));
  return saved
    .map((row) => {
      const article = byPageId.get(row.article_pageid);
      if (!article) return null;
      return {
        pageId: article.wikipedia_pageid,
        lang: article.lang,
        title: article.title,
        categories: article.categories,
        savedAt: row.saved_at,
      };
    })
    .filter((a): a is SavedArticle => a !== null);
}

export function useSavedArticlesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['saved-articles', userId],
    queryFn: () => fetchSavedArticles(userId!),
    enabled: !!userId,
  });
}
