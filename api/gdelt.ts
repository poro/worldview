// Vercel Edge Function — GDELT API proxy
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const targetUrl = `https://api.gdeltproject.org${url.pathname.replace('/api/gdelt', '')}${url.search}`;

  const res = await fetch(targetUrl, {
    headers: { 'User-Agent': 'WorldView/2.0' },
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
