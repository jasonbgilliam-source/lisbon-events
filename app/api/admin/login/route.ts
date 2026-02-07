import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_API_TOKEN not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";

  if (token !== expected) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return setAdminCookie();
}
