import { chromium } from "playwright";
import fs from "fs/promises";

const URL = "https://www.agendalx.pt/events/";

function clean(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
});

const apiCalls = [];

page.on("response", async (response) => {
  const url = response.url();
  if (url.includes("wp-json") || url.includes("admin-ajax.php") || url.includes("rest_route")) {
    try {
      const text = await response.text();
      apiCalls.push({
        url,
        status: response.status(),
        bodyPreview: text.slice(0, 2000)
      });
      console.log(`API: ${response.status()} ${url}`);
    } catch {}
  }
});

await page.goto(URL, { waitUntil: "networkidle" });

for (let i = 0; i < 100; i++) {
  const button = page.locator("text=ver mais, text=Ver mais").first();
  const visible = await button.isVisible().catch(() => false);
  if (!visible) {
    console.log("No more visible 'ver mais' button.");
    break;
  }

  console.log(`Clicking 'ver mais' #${i + 1}`);
  await button.click().catch(() => null);

  await page.waitForTimeout(1200);
}

await page.waitForTimeout(2000);

const bodyHtml = await page.content();
await fs.mkdir("tmp/source_inspect", { recursive: true });
await fs.writeFile("tmp/source_inspect/agendalx_events_page_after_clicks.html", bodyHtml, "utf8");
await fs.writeFile("tmp/source_inspect/agendalx_api_calls.json", JSON.stringify(apiCalls, null, 2), "utf8");

const links = await page.$$eval('a[href*="/events/event/"]', (nodes) => {
  const seen = new Set();
  const out = [];
  for (const a of nodes) {
    const href = a.href;
    const text = (a.textContent || "").replace(/\s+/g, " ").trim();
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push({ href, text });
  }
  return out;
});

await fs.writeFile("tmp/source_inspect/agendalx_event_links.json", JSON.stringify(links, null, 2), "utf8");

console.log("Unique event links:", links.length);
console.log("Saved:");
console.log("  tmp/source_inspect/agendalx_events_page_after_clicks.html");
console.log("  tmp/source_inspect/agendalx_api_calls.json");
console.log("  tmp/source_inspect/agendalx_event_links.json");

await browser.close();
