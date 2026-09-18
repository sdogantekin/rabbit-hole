import { GoogleSignin } from '@react-native-google-signin/google-signin';

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

// GoogleSignin.configure({ webClientId }) is called once, at app startup (see
// app/_layout.tsx) — it's the WEB client id, not the Android one, since that's what makes
// the native SDK issue an ID token audienced correctly for Supabase's google provider to
// verify (see supabase/config.toml's auth.external.google comment).
export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google sign-in did not return an ID token');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
}

// supabase.auth.signOut() only ends the Supabase session — the native Google SDK keeps its
// own separate session and, once it has one, silently re-signs the same account back in on
// the next signIn() call without showing the account picker. Clearing it here is what makes
// "log out, then choose a different Google account" actually work. Safe to call unconditionally:
// it's a no-op (resolves without throwing) when there's no active Google session to clear.
export async function signOutOfGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing to clear (not signed in via Google, or Play Services unavailable).
  }
}
