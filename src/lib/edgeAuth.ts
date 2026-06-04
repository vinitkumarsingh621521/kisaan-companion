import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the signed-in user's session JWT for direct fetch() calls to
 * Supabase Edge Functions. Falls back to the publishable (anon) key when
 * no session exists so unauthenticated callers still hit the function and
 * receive a clean 401 from the function's own auth guard.
 */
export async function edgeToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);
}
