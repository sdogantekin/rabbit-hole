import { supabase } from '@/lib/supabase/client';

export async function sendEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

// A guest's data lives under a real user_id (Postgres RLS and the profiles trigger treat
// anonymous users like any other), so it isn't lost — only local to this device until they
// later add an email (see requirements.md §6.7 for the eventual "upgrade" path).
export async function signInAsGuest(): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
