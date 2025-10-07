// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error(
      "Supabase URL or KEY missing. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
