import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type ProfilePatch = Partial<Database['public']['Tables']['profiles']['Update']>;

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, streak_count, discovery_score, level, analytics_opt_in, leaderboard_opt_in')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function updateProfile(userId: string, patch: ProfilePatch) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust: the path never changes on re-upload, so without this the old image would
  // stay in any CDN/client cache under the same URL.
  const publicUrl = `${data.publicUrl}?updated=${Date.now()}`;
  await updateProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

// Header streak/XP badge and the profile screen both read this; currently-default-zero
// streak/XP since that scoring logic isn't built yet, but the columns are real.
export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}

export function useUpdateProfileMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(userId!, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function useUploadAvatarMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (localUri: string) => uploadAvatar(userId!, localUri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
