#!/usr/bin/env node
/**
 * Replay API Server — serves historical flight snapshots from Supabase.
 * 
 * GET /api/snapshots?source=flights&time=UNIX&range=300
 * Returns flight positions closest to the requested timestamp.
 * 
 * Port: 3020 (proxied by Vite at /recorder)
 */

const http = require('http');
const https = require('https');

const WV_URL = 'https://mxbfffebroitdogmxolp.supabase.co';
const WV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc1NjcsImV4cCI6MjA4ODE1MzU2N30.bF6455VlQ50xMz0GS54R7S7ERWA5qpW5-fz-Uq6ziqg';
const PORT = 3020;

function fetchSupabase(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WV_URL);
    const req = https.get(url, {
      headers: { 'apikey': WV_KEY, 'Authorization': `Bearer ${WV_KEY}` },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve([]); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/snapshots') {
    const source = url.searchParams.get('source') || 'flights';
    const timeParam = url.searchParams.get('time');
    const range = parseInt(url.searchParams.get('range') || '300');

    if (!timeParam) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'time parameter required' }));
      return;
    }

    // Convert unix timestamp to ISO
    const targetTime = new Date(parseInt(timeParam) * 1000);
    const rangeStart = new Date(targetTime.getTime() - range * 1000);
    const rangeEnd = new Date(targetTime.getTime() + range * 1000);

    if (source === 'flights') {
      try {
        // Find the closest snapshot time within range
        const path = `/rest/v1/flight_snapshots?captured_at=gte.${rangeStart.toISOString()}&captured_at=lte.${rangeEnd.toISOString()}&order=captured_at.desc&limit=3000`;
        const rows = await fetchSupabase(path);

        // Convert to the format fetchReplayFlights expects
        const entities = rows.map(r => ({
          icao: r.icao24,
          callsign: r.callsign,
          lat: r.lat,
          lon: r.lon,
          altitude: r.altitude,
          speed: r.velocity,
          heading: r.heading,
          squawk: r.squawk,
          source: 'recorded',
        }));

        res.writeHead(200);
        res.end(JSON.stringify({ rows: entities, timestamp: targetTime.toISOString(), count: entities.length }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    } else if (source === 'events') {
      try {
        const path = `/rest/v1/conflict_events?select=*&order=event_time.desc&limit=100`;
        const rows = await fetchSupabase(path);
        res.writeHead(200);
        res.end(JSON.stringify({ events: rows }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ rows: [] }));
    }
  } else if (url.pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Replay Server] Listening on port ${PORT}`);
});
