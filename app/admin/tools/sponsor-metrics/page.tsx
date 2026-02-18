import { createClient } from "@supabase/supabase-js";

type Row = {
  event_slug: string;
  impressions: number;
  clicks: number;
  last_seen: string | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

export default async function SponsorMetricsPage() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Sponsor Metrics</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing env vars. Set <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> (and ensure{" "}
          <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> exists).
        </p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("sponsor_metrics_by_slug")
    .select("event_slug, impressions, clicks, last_seen");

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Sponsor Metrics</h1>
        <p className="mt-2 text-sm text-red-600">Failed to load metrics view.</p>
        <pre className="mt-4 rounded-xl bg-neutral-900 text-neutral-100 p-4 text-xs overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
        <p className="mt-3 text-sm text-neutral-600">
          Make sure the view <span className="font-mono">public.sponsor_metrics_by_slug</span> exists.
        </p>
      </div>
    );
  }

  const rows = (data || []) as Row[];

  // Sort by impressions desc, then clicks desc (explicit)
  rows.sort((a, b) => {
    if ((b.impressions || 0) !== (a.impressions || 0)) return (b.impressions || 0) - (a.impressions || 0);
    return (b.clicks || 0) - (a.clicks || 0);
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions || 0;
      acc.clicks += r.clicks || 0;
      return acc;
    },
    { impressions: 0, clicks: 0 }
  );

  const totalCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Sponsor Metrics</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Counts by event slug from <span className="font-mono">sponsor_metrics</span>.
          </p>
        </div>

        <div className="rounded-2xl border bg-white/60 px-4 py-3 shadow-sm">
          <div className="text-xs text-neutral-500">Totals</div>
          <div className="mt-1 flex gap-4 text-sm">
            <div>
              <span className="font-semibold">{totals.impressions}</span>{" "}
              <span className="text-neutral-600">impressions</span>
            </div>
            <div>
              <span className="font-semibold">{totals.clicks}</span>{" "}
              <span className="text-neutral-600">clicks</span>
            </div>
            <div>
              <span className="font-semibold">{pct(totalCtr)}</span>{" "}
              <span className="text-neutral-600">CTR</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-left">
              <th className="px-4 py-3">Event slug</th>
              <th className="px-4 py-3">Impressions</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">CTR</th>
              <th className="px-4 py-3">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-neutral-600" colSpan={5}>
                  No sponsor metrics yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const impressions = r.impressions || 0;
                const clicks = r.clicks || 0;
                const ctr = impressions > 0 ? clicks / impressions : 0;

                return (
                  <tr key={r.event_slug} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{r.event_slug}</td>
                    <td className="px-4 py-3">{impressions}</td>
                    <td className="px-4 py-3">{clicks}</td>
                    <td className="px-4 py-3">{pct(ctr)}</td>
                    <td className="px-4 py-3 text-neutral-700">{fmtDate(r.last_seen)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-neutral-500">
        Tip: Invoice-friendly proof = screenshot this table + include date range in the email.
        If you want date range filtering next, we can add “Last 7 / 30 / 90 days” with a second view or query.
      </div>
    </div>
  );
}
