import { supabase } from "@/integrations/supabase/client";

/**
 * Build headers for direct fetch() calls to Supabase Edge Functions.
 * Sends the signed-in user's session JWT so edge functions can validate the caller.
 * Falls back to the publishable (anon) key only when no session exists.
 */
export async function edgeAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...extra,
  };
}
