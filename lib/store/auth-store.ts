import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  session: Session | null;
  isInitializing: boolean;
  setSession: (session: Session | null) => void;
}

// Populated by a single supabase.auth.onAuthStateChange subscription in app/_layout.tsx.
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isInitializing: true,
  setSession: (session) => set({ session, isInitializing: false }),
}));
