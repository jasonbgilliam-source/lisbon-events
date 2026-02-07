"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-le-csrf": "1",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any)?.error || "Logout failed");
        return;
      }

      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
      <button
        onClick={logout}
        disabled={busy}
        className="rounded-md border px-3 py-2 text-sm"
        title="Logout"
      >
        {busy ? "Logging out…" : "Logout"}
      </button>
    </div>
  );
}
