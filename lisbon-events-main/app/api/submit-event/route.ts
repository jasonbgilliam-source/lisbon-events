// app/api/submit-event/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function toIso(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function allowedCategories(): Promise<Set<string>> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("category_catalog").select("name");
  if (error) throw new Error(error.message);
  return new Set((data || []).map((r: any) => String(r.name)));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const location_name = (body.location_name || "").trim();
    const organizer_email = (body.organizer_email || "").trim();
    const starts_at = toIso(body.starts_at || body.start);

    if (!title || !description || !location_name || !organizer_email || !starts_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ends_at = toIso(body.ends_at || body.end);
    const all_day =
      String(body.all_day ?? "").trim().toLowerCase() === "true" || body.all_day === true;

    // Category from catalog only
    const category = (body.category ?? "").toString().trim();
    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    const allowed = await allowedCategories();
    if (!allowed.has(category)) {
      return NextResponse.json({ error: "Invalid category. Please select from the list." }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from("event_submissions")
      .insert([{
        title,
        description,
        starts_at,
        ends_at,
        location_name,
        address: body.address ?? null,
        ticket_url: body.ticket_url ?? null,
        image_url: body.image_url ?? null,
        organizer_email,
        age: body.age ?? null,
        city: body.city ?? null,
        all_day,
        category,
        youtube_url: body.youtube_url ?? null,
        spotify_url: body.spotify_url ?? null,
        status: "pending",
      }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
