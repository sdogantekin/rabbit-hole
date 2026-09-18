import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

// D14 (gamification.md §5): "earned" is permanent once evaluate_and_award_badges() writes
// it, so this is a plain read — no live recomputation from likes/streak/XP here anymore.
async function fetchEarnedBadgeIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.badge_id));
}

export function useEarnedBadgesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['earned-badges', userId],
    queryFn: () => fetchEarnedBadgeIds(userId!),
    enabled: !!userId,
  });
}
