// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Read-only client for your app (safe to use in server or client components).
 * Uses the public anon key and is restricted by your RLS policies.
 *
 * Required env vars (already added in Step 1):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
