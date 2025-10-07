// app/api/categories/upsert/route.ts
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Admin protection via x-admin-key header (matches process.env.ADMIN_KEY) */
function assertAdmin(req: Request) {
  const want = process.env.ADMIN_KEY;
  const got = req.headers.get("x-admin-key");
  if (!want || !got || got !== want) {
    return !want ? "Server missing ADMIN_KEY env var." : "Unauthorized.";
  }
  return null;
}

export async function POST(req: Request) {
  const authErr = assertAdmin(req);
  if (authErr) {
    return new Response(JSON.stringify({ error: authErr }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    const renameFrom = (body.renameFrom || "").toString().trim(); // optional

    if (!name) {
      return new Response(JSON.stringify({ error: "Missing category name" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = supabaseServer();

    if (renameFrom && renameFrom !== name) {
      const { error: delErr } = await supabase
        .from("category_catalog")
        .delete()
        .eq("name", renameFrom);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 500, headers: { "Content-Type": "application/json" },
        });
      }
    }

    const { error } = await supabase
      .from("category_catalog")
      .upsert([{ name }], { onConflict: "name" });

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
