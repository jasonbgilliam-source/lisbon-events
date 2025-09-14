export async function GET() {
  const ok =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return new Response(JSON.stringify({ ok }), {
    headers: { "Content-Type": "application/json" },
  });
}
