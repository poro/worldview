import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const group = (req.query.GROUP as string) || 'stations';
  const format = (req.query.FORMAT as string) || 'tle';
  const target = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=${format}`;

  try {
    const response = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 WorldView/1.0' },
    });
    const data = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'text/plain');
    res.status(response.status).send(data);
  } catch (e) {
    res.status(502).send('CelesTrak unavailable');
  }
}
