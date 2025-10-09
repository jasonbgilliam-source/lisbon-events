// app/api/submit/route.ts
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

// Fetch allowed categories from Supabase
async function allowedCategories(): Promise<Set<string>> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("category_catalog").select("name");
  if (error) throw new Error(error.message);
  return new Set((data || []).map((r: any) => String(r.name)));
}

export async function POST(req: Request) {
  try {
    const b = await req.json();

    // Validate required fields
    for (const k of ["title", "description", "starts_at", "location_name", "organizer_email"]) {
      if (!b[k]) {
        return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
      }
    }

    const starts_at = toIso(b.starts_at);
    const ends_at = toIso(b.ends_at);

    // Check and validate category
    const category = (b.category ?? "").toString().trim();
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    const allowed = await allowedCategories();
    if (!allowed.has(category)) {
      return NextResponse.json(
        { error: "Invalid category. Please select from the list." },
        { status: 400 }
      );
    }

    // Insert into event_submissions
    const supabase = supabaseServer();
    const { error } = await supabase.from("event_submissions").insert([
      {
        title: b.title,
        description: b.description,
        starts_at,
        ends_at,
        location_name: b.location_name,
        address: b.address || null,
        ticket_url: b.ticket_url || null,
        image_url: b.image_url || null,
        organizer_email: b.organizer_email,
        age: b.age || null,
        city: b.city || null,
        all_day:
          String(b.all_day ?? "").trim().toLowerCase() === "true" || b.all_day === true,
        category,
        youtube_url: b.youtube_url ?? null,
        spotify_url: b.spotify_url ?? null,
        status: "pending",
      },
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Error in /api/submit:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
