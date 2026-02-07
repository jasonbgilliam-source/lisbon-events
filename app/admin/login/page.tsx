"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any)?.error || "Login failed");
        return;
      }

      router.push("/admin/tools/submissions-debug");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold">Admin Login</h1>

        <div className="space-y-2">
          <label className="text-sm font-medium">Admin Token</label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoFocus
          />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || !token}
          className="w-full rounded-md px-3 py-2 border"
        >
          {busy ? "Logging in…" : "Login"}
        </button>
      </form>
    </main>
  );
}
