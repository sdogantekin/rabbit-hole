import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

const USER_INTERESTS_KEY = ['user-interests'] as const;

async function fetchUserInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_interests')
    .select('category_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.category_id);
}

// Adds a baseline (weight 1.0) row for any newly-selected category; never touches an
// existing row. This runs both at onboarding (nothing exists yet, so it's pure insert)
// and from "Edit interests" later — deleting-and-reinserting there would silently wipe
// weights already learned from real swipes on categories the user keeps selected.
export async function saveUserInterests(userId: string, categorySlugs: string[]): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('user_interests')
    .select('category_id')
    .eq('user_id', userId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existing ?? []).map((row) => row.category_id));
  const newCategoryIds = categorySlugs.filter((id) => !existingIds.has(id));
  if (newCategoryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from('user_interests')
    .insert(newCategoryIds.map((categoryId) => ({ user_id: userId, category_id: categoryId })));
  if (insertError) throw insertError;
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
