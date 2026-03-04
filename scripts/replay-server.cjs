#!/usr/bin/env node
/**
 * Replay API Server — serves historical flight snapshots.
 * 
 * Sources (tried in order):
 *   1. OpenSky Network historical states (/states/all?time=T) — up to ~1h back
 *   2. Supabase flight_snapshots — our own 5-min recorder data
 * 
 * GET /api/snapshots?source=flights&time=UNIX&range=300
 * GET /api/health
 * 
 * Port: 3020 (proxied by Vite at /recorder)
 */

const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');

const WV_URL = 'https://mxbfffebroitdogmxolp.supabase.co';
const WV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc1NjcsImV4cCI6MjA4ODE1MzU2N30.bF6455VlQ50xMz0GS54R7S7ERWA5qpW5-fz-Uq6ziqg';

const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_CLIENT_ID = 'endless-api-client';
const OPENSKY_CLIENT_SECRET = '2xFeE45Jh9y1osph7ulhsYrIAzBHoMJW';
const OPENSKY_STATES_URL = 'https://opensky-network.org/api/states/all';

const PORT = 3020;

// === OpenSky Token Cache ===
let tokenCache = { token: null, expiresAt: 0 };

function getOpenSkyToken() {
  return new Promise((resolve, reject) => {
    if (tokenCache.token && tokenCache.expiresAt > Date.now() + 60000) {
      return resolve(tokenCache.token);
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    }).toString();

    const url = new URL(OPENSKY_TOKEN_URL);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          tokenCache = { token: parsed.access_token, expiresAt: Date.now() + (parsed.expires_in || 1800) * 1000 - 60000 };
          resolve(parsed.access_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('token timeout')); });
    req.write(body);
    req.end();
  });
}

// === OpenSky Historical Fetch ===
function fetchOpenSkyHistorical(unixTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getOpenSkyToken();
      const url = new URL(`${OPENSKY_STATES_URL}?time=${unixTime}`);
      const req = https.get(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'WorldView/1.0' },
      }, (res) => {
        if (res.statusCode === 403 || res.statusCode === 404) {
          // Out of range — OpenSky only supports ~1h back
          return resolve(null);
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const states = parsed.states || [];
            const entities = states
              .filter(s => s[5] != null && s[6] != null)
              .map(s => ({
                icao: (s[0] || '').trim(),
                callsign: (s[1] || '').trim(),
                lat: s[6],
                lon: s[5],
                altitude: s[7] != null ? Math.round(s[7] / 0.3048) : null, // m→ft for compat
                speed: s[9] != null ? Math.round(s[9] / 0.514444) : null,  // m/s→kts
                heading: s[10],
                squawk: s[14],
                on_ground: s[8] || false,
                source: 'opensky-historical',
              }));
            resolve({ rows: entities, timestamp: new Date(unixTime * 1000).toISOString(), count: entities.length, source: 'opensky' });
          } catch (e) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(20000, () => { req.destroy(); resolve(null); });
    } catch (e) {
      resolve(null);
    }
  });
}

// === Supabase Fetch ===
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

function fetchSupabaseSnapshots(targetTime, range) {
  const rangeStart = new Date(targetTime.getTime() - range * 1000);
  const rangeEnd = new Date(targetTime.getTime() + range * 1000);
  const path = `/rest/v1/flight_snapshots?captured_at=gte.${rangeStart.toISOString()}&captured_at=lte.${rangeEnd.toISOString()}&order=captured_at.desc&limit=3000`;
  return fetchSupabase(path).then(rows => {
    const entities = (rows || []).map(r => ({
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
    return { rows: entities, timestamp: targetTime.toISOString(), count: entities.length, source: 'supabase' };
  });
}

// === Server ===
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
      return res.end(JSON.stringify({ error: 'time parameter required' }));
    }

    const unixTime = parseInt(timeParam);
    const targetTime = new Date(unixTime * 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    const ageSeconds = nowUnix - unixTime;

    if (source === 'flights') {
      try {
        let result = null;

        // 1. If within ~1 hour, try OpenSky historical first
        if (ageSeconds > 30 && ageSeconds < 3900) {
          console.log(`[Replay] Trying OpenSky historical (${ageSeconds}s ago)...`);
          result = await fetchOpenSkyHistorical(unixTime);
          if (result) {
            console.log(`[Replay] OpenSky: ${result.count} aircraft at ${result.timestamp}`);
          }
        }

        // 2. Fallback to Supabase snapshots
        if (!result || result.count === 0) {
          console.log(`[Replay] Falling back to Supabase snapshots...`);
          result = await fetchSupabaseSnapshots(targetTime, range);
          console.log(`[Replay] Supabase: ${result.count} aircraft`);
        }

        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (e) {
        console.error('[Replay] Error:', e.message);
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
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), tokenCached: tokenCache.expiresAt > Date.now() }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Replay Server] Listening on port ${PORT}`);
  console.log(`[Replay Server] OpenSky historical: up to ~1h lookback`);
  console.log(`[Replay Server] Supabase snapshots: older data from recorder`);
});
