// Cookie-based admin fetch helpers (no tokens in browser JS)

const CSRF_HEADER_NAME = "x-le-csrf";
const CSRF_HEADER_VALUE = "1";

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
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();
  const data = await parseJsonSafe(text);

  if (!res.ok) {
    const msg =
      (data as any)?.error ||
      (data as any)?.message ||
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
      [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
    },
    credentials: "include",
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  const data = await parseJsonSafe(text);

  if (!res.ok) {
    const msg =
      (data as any)?.error ||
      (data as any)?.message ||
      `Admin request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}
