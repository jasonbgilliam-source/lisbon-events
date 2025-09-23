// app/api/submissions/list/route.ts
import { supabaseServer } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseServer();

  // Grab latest 200, then keep only "pending" (tolerant of null/empty)
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const items = (data || []).filter((row: any) => {
    const s = (row.status ?? "").toString().trim().toLowerCase();
    return s === "" || s === "pending";
  });

  return new Response(JSON.stringify({ items }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
