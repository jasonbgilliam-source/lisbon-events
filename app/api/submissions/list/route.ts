// app/api/submissions/list/route.ts
import { supabaseServer } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ items: data }), {
    headers: { "Content-Type": "application/json" },
  });
}
