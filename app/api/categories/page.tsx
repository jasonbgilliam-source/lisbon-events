"use client";

import * as React from "react";

type Cat = { name: string };

export default function CategoriesAdminPage() {
  const [cats, setCats] = React.useState<Cat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [adminKey, setAdminKey] = React.useState<string>("");

  const [newName, setNewName] = React.useState("");
  const [renameFrom, setRenameFrom] = React.useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/categories/list", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setCats((j.categories || []).map((name: string) => ({ name })));
    } catch (e: any) {
      setError(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function adminPost(url: string, body: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey || "",
      },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  }

  async function addOrRename() {
    if (!newName.trim()) { alert("Enter a category name"); return; }
    try {
      await adminPost("/api/categories/upsert", { name: newName.trim(), renameFrom: renameFrom.trim() || undefined });
      setNewName(""); setRenameFrom("");
      await load();
      alert("Saved");
    } catch (e: any) {
      alert(e.message || "Failed to save");
    }
  }

  async function remove(name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await adminPost("/api/categories/delete", { name });
      await load();
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Category Catalog (Admin)</h1>

      <div className="border rounded p-3 mb-4">
        <label className="block text-xs font-medium">Admin Key</label>
        <input
          type="password"
          className="border p-2 w-full"
          placeholder="Enter ADMIN_KEY"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />
        <p className="text-xs text-gray-600 mt-1">
          This is sent only as a header to protected endpoints. Set <code>ADMIN_KEY</code> in your Vercel env.
        </p>
      </div>

      <div className="border rounded p-3 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <label className="block text-xs font-medium">Rename From (optional)</label>
          <input
            className="border p-2 w-full"
            placeholder="Existing name"
            value={renameFrom}
            onChange={(e) => setRenameFrom(e.target.value)}
            list="catlist"
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium">New Name</label>
          <input
            className="border p-2 w-full"
            placeholder="New or existing name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="md:col-span-1 flex items-end">
          <button className="border px-3 py-2 rounded w-full" onClick={addOrRename}>Save</button>
        </div>
        <datalist id="catlist">
          {cats.map(c => <option key={c.name} value={c.name} />)}
        </datalist>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Existing Categories</h2>
        <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}
      {!error && loading && <p>Loading…</p>}

      <ul className="space-y-2">
        {cats.map(c => (
          <li key={c.name} className="border rounded p-3 flex items-center justify-between">
            <span>{c.name}</span>
            <button className="border px-2 py-1 rounded" onClick={() => remove(c.name)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
