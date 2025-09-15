// app/api/db-health/route.ts
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = supabaseServer();
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, count }), {
    headers: { "Content-Type": "application/json" },
  });
}
