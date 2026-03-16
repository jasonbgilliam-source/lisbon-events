import { NextResponse } from "next/server";
import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { runAdminIngest } from "@/lib/adminIngest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const summary = await runAdminIngest();
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Ingest failed",
      },
      { status: 500 }
    );
  }
}
