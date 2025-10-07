// app/api/categories/list/route.ts
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("category_catalog")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const categories = (data || []).map((r: any) => r.name);
  return new Response(JSON.stringify({ categories }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
