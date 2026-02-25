import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const params = new URLSearchParams(req.query as Record<string, string>).toString();
  const target = `https://opensky-network.org/api/states/all${params ? '?' + params : ''}`;

  try {
    const response = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 WorldView/1.0' },
    });
    const data = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(data);
  } catch (e) {
    res.status(502).json({ error: 'OpenSky API unavailable' });
  }
}
