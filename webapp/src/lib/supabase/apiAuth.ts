import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Get Supabase client and user from API request.
 * Supports cookie-based auth (web) or Authorization: Bearer <jwt> (mobile).
 */
export async function getSupabaseAndUserFromRequest(
  request: Request
): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearerToken) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    const supabase = createSupabaseClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearerToken);
    if (error || !user?.email) return null;
    return { supabase, user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { supabase, user };
}
