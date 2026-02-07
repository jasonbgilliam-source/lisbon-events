import { requireAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  return NextResponse.json({ ok: true, admin: true });
}
