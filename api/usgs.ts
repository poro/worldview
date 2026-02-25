export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const target = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

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
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'USGS unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
