// lib/githubCsv.ts
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const REPO_OWNER = process.env.REPO_OWNER!;
const REPO_NAME  = process.env.REPO_NAME!;
const BRANCH     = process.env.REPO_BRANCH || "main";
const FILE_PATH  = process.env.CSV_PATH || "public/events.csv";

function csvEscape(value?: string | boolean | null) {
  if (value === undefined || value === null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvRow(e: Record<string, any>) {
  const order = [
    "title","start","end","all_day","venue","city","address","price","age",
    "category","description","organizer","source_url","tags","recurrence_note"
  ] as const;
  return order.map(k => csvEscape(e[k])).join(",");
}

async function getFileShaAndContent() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(FILE_PATH)}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }
  });
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const contentB64 = json.content as string;
  const encoding = json.encoding as string;
  const sha = json.sha as string;
  const current = encoding === "base64"
    ? Buffer.from(contentB64, "base64").toString("utf8")
    : contentB64;
  return { sha, current };
}

export async function appendRowToCsv(row: string, commitMsg: string) {
  const { sha, current } = await getFileShaAndContent();
  const next = current.endsWith("\n") ? `${current}${row}\n` : `${current}\n${row}\n`;

  const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(FILE_PATH)}`;
  const commitRes = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMsg,
      content: Buffer.from(next, "utf8").toString("base64"),
      sha,
      branch: BRANCH,
    }),
  });

  if (!commitRes.ok) {
    throw new Error(`GitHub PUT failed: ${commitRes.status} ${await commitRes.text()}`);
  }
}
