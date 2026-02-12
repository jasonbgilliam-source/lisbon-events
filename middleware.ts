import { NextRequest, NextResponse } from "next/server";
import { getCityFromHost } from "@/lib/city";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const city = getCityFromHost(host);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-city", city);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Run on everything except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
