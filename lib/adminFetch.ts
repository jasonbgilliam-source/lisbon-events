// lib/adminFetch.ts
// Client-side helper for calling /api/admin/* routes.
// Requires NEXT_PUBLIC_ADMIN_API_TOKEN to be set in .env.local.

export function adminHeaders(): HeadersInit {
  const token = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || "";
  return token ? { "x-admin-token": token } : {};
}

async function parseJsonSafe(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function adminGetJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { ...adminHeaders() },
    cache: "no-store",
  });

  const text = await res.text();
  const data: any = await parseJsonSafe(text);

  if (!res.ok) {
    const msg =
      data?.error ||
      `Admin request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export async function adminPostJSON<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  const data: any = await parseJsonSafe(text);

  if (!res.ok) {
    const msg =
      data?.error ||
      `Admin request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}
