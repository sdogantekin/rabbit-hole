import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BASELINE_WEIGHT, WEIGHT_FLOOR } from '@/constants/interest-categories';
import { supabase } from '@/lib/supabase/client';
import { useFeedStore } from '@/lib/store/feed-store';

const USER_INTERESTS_KEY = ['user-interests'] as const;

// `user_interests` also holds swipe-derived weight rows for categories the user never
// explicitly picked (apply_interest_weight_delta writes one for any category a swiped
// article belongs to, by design — see get-feed's exploration sampling). `selected` is what
// separates "this is one of your chosen interests" from "you have a tracked weight for this
// because you swiped on it"; only that flag should ever gate what Edit Interests shows as
// checked. Bug found 2026-09-19: this used to read plain row existence, so a user who'd
// swiped broadly saw every category checked.
async function fetchUserInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_interests')
    .select('category_id')
    .eq('user_id', userId)
    .eq('selected', true);
  if (error) throw error;
  return data.map((row) => row.category_id);
}

// Reconciles `selected` to exactly match categorySlugs — sets it true for anything newly
// checked (inserting a baseline-weight row if none exists yet, or just flipping the flag if
// a swipe-derived row is already there — that weight is left alone, so real signal from
// actual swiping is never discarded just because the user also explicitly picked it), and
// false for anything unchecked. User-reported 2026-09-19: unselecting a category previously
// had no effect on the feed at all, since get-feed samples by weight regardless of
// `selected` — this resets weight to the floor on unselect so removing an interest actually
// suppresses it going forward (still not exactly zero, matching "a category never fully
// disappears" elsewhere in the weight system). Never deletes a row.
export async function saveUserInterests(userId: string, categorySlugs: string[]): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('user_interests')
    .select('category_id, selected')
    .eq('user_id', userId);
  if (fetchError) throw fetchError;

  const existingSelectedById = new Map((existing ?? []).map((row) => [row.category_id, row.selected]));
  const selectedSlugs = new Set(categorySlugs);

  const toInsert = categorySlugs.filter((id) => !existingSelectedById.has(id));
  const toSelect = categorySlugs.filter((id) => existingSelectedById.get(id) === false);
  const toUnselect = [...existingSelectedById.entries()]
    .filter(([id, selected]) => selected && !selectedSlugs.has(id))
    .map(([id]) => id);

  if (toInsert.length > 0) {
    const { error } = await supabase.from('user_interests').insert(
      toInsert.map((categoryId) => ({
        user_id: userId,
        category_id: categoryId,
        selected: true,
        weight: BASELINE_WEIGHT,
      })),
    );
    if (error) throw error;
  }
  if (toSelect.length > 0) {
    // Weight deliberately untouched here — see the function comment above.
    const { error } = await supabase
      .from('user_interests')
      .update({ selected: true })
      .eq('user_id', userId)
      .in('category_id', toSelect);
    if (error) throw error;
  }
  if (toUnselect.length > 0) {
    const { error } = await supabase
      .from('user_interests')
      .update({ selected: false, weight: WEIGHT_FLOOR })
      .eq('user_id', userId)
      .in('category_id', toUnselect);
    if (error) throw error;
  }
}

export function useServerInterestsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: [...USER_INTERESTS_KEY, userId],
    queryFn: () => fetchUserInterests(userId!),
    enabled: !!userId,
  });
}

export function useSaveInterestsMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categorySlugs: string[]) => saveUserInterests(userId!, categorySlugs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...USER_INTERESTS_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: ['user-interest-weights', userId] });
      // User-reported 2026-09-19: cards already queued locally kept showing regardless of
      // an interest change, since the deck only grows/gets consumed, never refetched, until
      // it runs low. Clearing it makes the change felt on the very next card, not eventually.
      useFeedStore.getState().refreshForInterestChange();
    },
  });
}

export interface CategoryWeight {
  categoryId: string;
  weight: number;
}

async function fetchUserInterestWeights(userId: string): Promise<CategoryWeight[]> {
  const { data, error } = await supabase
    .from('user_interests')
    .select('category_id, weight')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => ({ categoryId: row.category_id, weight: row.weight }));
}

// Powers the profile screen's "why you see what you see" bar chart.
export function useInterestWeightsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-interest-weights', userId],
    queryFn: () => fetchUserInterestWeights(userId!),
    enabled: !!userId,
  });
}
