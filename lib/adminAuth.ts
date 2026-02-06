// lib/adminAuth.ts
import { NextResponse } from "next/server";

export function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN;

  // If not configured, fail closed.
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  const got = req.headers.get("x-admin-token") || "";
  if (got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // ok
}
