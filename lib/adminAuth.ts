import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "le_admin";
export const CSRF_HEADER_NAME = "x-le-csrf";
export const CSRF_HEADER_VALUE = "1";

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

/**
 * requireAdmin(req)
 * ✅ returns Response when denied
 * ✅ returns null when allowed
 */
export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    return NextResponse.json({ error: "ADMIN_API_TOKEN not set" }, { status: 500 });
  }

  const cookieVal = readCookie(req, ADMIN_COOKIE_NAME);
  if (!cookieVal || cookieVal !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * requireCsrf(req)
 * Simple CSRF hardening:
 * - Same-origin check (Origin vs Host) when Origin is present
 * - Require a custom header for state-changing requests
 *
 * ✅ returns Response when denied
 * ✅ returns null when allowed
 */
export function requireCsrf(req: Request): Response | null {
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin") || "";

  if (origin) {
    const ok = origin === `https://${host}` || origin === `http://${host}`;
    if (!ok) {
      return NextResponse.json({ error: "CSRF blocked (bad origin)" }, { status: 403 });
    }
  }

  const hdr = req.headers.get(CSRF_HEADER_NAME);
  if (hdr !== CSRF_HEADER_VALUE) {
    return NextResponse.json({ error: "CSRF blocked (missing header)" }, { status: 403 });
    }

  return null;
}

export function setAdminCookie() {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_API_TOKEN not configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });

  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(expected)}; Path=/; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  return res;
}

export function clearAdminCookie() {
  const res = NextResponse.json({ ok: true });

  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  return res;
}
