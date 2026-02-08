// app/api/submit-event/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toIso(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function allowedCategories(): Promise<Set<string>> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("category_catalog").select("name");

  if (error) {
    console.error("❌ allowedCategories error:", error);
    throw new Error(error.message);
  }

  return new Set((data || []).map((r: any) => String(r.name)));
}

const AUDIENCE_OPTIONS = ["All Ages", "Family", "Kids", "Teens", "Adults"] as const;

function defaultAudienceExpanded(): string[] {
  return ["All Ages", "Family", "Kids", "Teens", "Adults"];
}

function normalizeAudience(input: any): string[] | null {
  let arr: string[] = [];

  if (Array.isArray(input)) {
    arr = input.map((x) => String(x));
  } else if (typeof input === "string") {
    arr = input.split(/[|,;/]+/g).map((s) => s.trim());
  } else if (input != null) {
    arr = [String(input)];
  }

  arr = arr.map((s) => s.trim()).filter(Boolean);
  if (arr.length === 0) return null;

  const normalized = arr
    .map((s) => {
      const hit = AUDIENCE_OPTIONS.find((opt) => opt.toLowerCase() === s.toLowerCase());
      return hit ?? null;
    })
    .filter(Boolean) as string[];

  if (normalized.length === 0) return null;

  const hasAllAges = normalized.includes("All Ages");
  const expanded = hasAllAges ? defaultAudienceExpanded() : normalized;

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const x of expanded) {
    if (!seen.has(x)) {
      seen.add(x);
      deduped.push(x);
    }
  }

  return deduped;
}

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("🧾 submit-event payload keys:", Object.keys(body || {}));
    console.log("🧾 submit-event raw audience:", body?.audience);

    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const location_name = (body.location_name || "").trim();
    const organizer_email = (body.organizer_email || "").trim();

    const starts_at = toIso(body.starts_at ?? body.start);
    const ends_at = toIso(body.ends_at ?? body.end);

    if (!title || !description || !location_name || !organizer_email || !starts_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const all_day =
      String(body.all_day ?? "").trim().toLowerCase() === "true" || body.all_day === true;

    const category = (body.category ?? "").toString().trim();
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

    const normalizedAudience = normalizeAudience(body.audience);
    console.log("🧾 submit-event normalized audience:", normalizedAudience);

    // Default to All Ages (expanded) only when missing/empty
    const audience = normalizedAudience ?? defaultAudienceExpanded();

    const supabase = supabaseServer();
    const { error } = await supabase.from("event_submissions").insert([
      {
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
        audience,
        city: body.city ?? null,
        all_day,
        category,
        youtube_url: body.youtube_url ?? null,
        spotify_url: body.spotify_url ?? null,
        is_free: toBool(body.is_free),
        status: "pending",
      },
    ]);

    if (error) {
      console.error("❌ insert event_submissions error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, audience });
  } catch (e: any) {
    console.error("❌ submit-event exception:", e);
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
