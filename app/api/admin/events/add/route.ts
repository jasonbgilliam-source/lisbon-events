import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Keep this aligned with your "events" table columns used elsewhere (approve route)
type EventForm = {
  title: string;

  // Accept flexible date strings (ISO or "YYYY-MM-DD HH:mm")
  start: string;
  end?: string;

  all_day?: boolean | string;

  // UI fields
  venue?: string;     // will map -> location_name
  city?: string;
  address?: string;

  // Optional metadata
  category?: string;
  description?: string;
  age?: string;

  // URLs
  ticket_url?: string;
  image_url?: string;

  // Optional
  organizer_email?: string;
  youtube_url?: string;
  spotify_url?: string;
};

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "true";
}

function toIsoOrThrow(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${s}`);
  return d.toISOString();
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const body = (await req.json()) as Partial<EventForm>;

    if (!body?.title || !body?.start) {
      return NextResponse.json({ error: "title and start are required" }, { status: 400 });
    }

    const starts_at = toIsoOrThrow(body.start);
    const ends_at = toIsoOrThrow(body.end ?? body.start);
    const all_day = toBool(body.all_day);

    const supabase = supabaseServer();

    const { error } = await supabase.from("events").insert([
      {
        title: body.title,
        description: body.description ?? null,
        starts_at,
        ends_at,
        category: body.category ?? null,
        location_name: body.venue ?? null,
        city: body.city ?? null,
        address: body.address ?? null,
        ticket_url: body.ticket_url ?? null,
        image_url: body.image_url ?? null,
        all_day,
        age: body.age ?? null,
        organizer_email: body.organizer_email ?? null,
        youtube_url: body.youtube_url ?? null,
        spotify_url: body.spotify_url ?? null,
      },
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
