export async function GET() {
  return new Response(JSON.stringify({ ok: true, where: "app" }), {
    headers: { "Content-Type": "application/json" },
  });
}
