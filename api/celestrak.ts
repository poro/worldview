export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const group = url.searchParams.get('GROUP') || 'stations';
  const format = url.searchParams.get('FORMAT') || 'tle';
  const target = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=${format}`;

  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': 'WorldView/1.0' },
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response('CelesTrak unavailable', {
      status: 502,
    });
  }
}
