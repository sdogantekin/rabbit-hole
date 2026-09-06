import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { Database } from '../../../lib/supabase/types.ts';

// Forwards the caller's own JWT so every query is scoped by RLS to auth.uid().
export function createUserScopedClient(req: Request): SupabaseClient<Database> {
  return createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
}

// Bypasses RLS. Only for writes that no per-user policy could ever cover (wiki-proxy's
// shared articles_cache writes) — never use this to act on behalf of a specific user.
export function createServiceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
