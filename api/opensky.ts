export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams.toString();
  const target = `https://opensky-network.org/api/states/all${params ? '?' + params : ''}`;

  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': 'WorldView/1.0' },
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=10',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'OpenSky API unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
