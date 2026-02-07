import { clearAdminCookie, requireAdmin, requireCsrf } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  return clearAdminCookie();
}
