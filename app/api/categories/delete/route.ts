// app/api/categories/delete/route.ts
import { supabaseServer } from "../../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function assertAdmin(req: Request) {
  const want = process.env.ADMIN_KEY;
  const got = req.headers.get("x-admin-key");
  if (!want || !got || got !== want) {
    const msg = !want
      ? "Server missing ADMIN_KEY env var."
      : "Unauthorized.";
    return msg;
  }
  return null;
}

export async function POST(req: Request) {
  const err = assertAdmin(req);
  if (err) {
    return new Response(JSON.stringify({ error: err }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    if (!name) {
      return new Response(JSON.stringify({ error: "Missing category name" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("category_catalog")
      .delete()
      .eq("name", name);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
