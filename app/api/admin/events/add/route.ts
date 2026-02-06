// app/api/add-event/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Keep this in sync with your table column names.
type EventForm = {
  title: string;
  start: string;        // e.g. "2025-09-15 19:30" or ISO
  end?: string;         // if missing, we'll mirror start
  all_day?: boolean | string;
  venue?: string;
  city?: string;
  address?: string;
  price?: string;
  age?: string;
  category?: string;
  description?: string;
  organizer?: string;
  source_url?: string;
  tags?: string;
  recurrence_note?: string;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EventForm;

    // Basic required fields
    if (!body?.title || !body?.start) {
      return NextResponse.json(
        { error: "title and start are required" },
        { status: 400 }
      );
    }

    const start = toIsoOrThrow(body.start);
    const end = toIsoOrThrow(body.end ?? body.start);
    const all_day = toBool(body.all_day);

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("events")
      .upsert(
        [
          {
            title: body.title,
            start,
            end,
            all_day,
            venue: body.venue,
            city: body.city,
            address: body.address,
            price: body.price,
            age: body.age,
            category: body.category,
            description: body.description,
            organizer: body.organizer,
            source_url: body.source_url,
            tags: body.tags,
            recurrence_note: body.recurrence_note,
          },
        ],
        // IMPORTANT: match this to the UNIQUE INDEX you created in Step 2C
        { onConflict: "title,start,venue" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
