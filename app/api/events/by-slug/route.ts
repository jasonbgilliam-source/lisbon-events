import { NextRequest, NextResponse } from "next/server";
import { loadSeries } from "@/lib/eventOccurrences";
import { matchesWindow } from "@/lib/eventSeries.mjs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  try {
    const groups = await loadSeries();
    const event = groups.find((e: any) => e.members.some((m: any) => m.slug === slug));
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const occurrences = event.occurrences.filter((o: any) => matchesWindow(o, new Date().toISOString(), null));
    return NextResponse.json({ ok: true, item: { ...event, occurrences } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
