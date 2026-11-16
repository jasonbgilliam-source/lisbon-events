import { GET as list } from '../list/route';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Use the same approved occurrences as listings. No daily expansion or CSV bypass.
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.searchParams.set('view', 'calendar');
  return list(new Request(url, { headers: request.headers }));
}
