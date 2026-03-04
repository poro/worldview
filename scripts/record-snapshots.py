#!/usr/bin/env python3
"""Record flight snapshots to Supabase for replay."""

import json
import time
from datetime import datetime, timezone
from urllib.request import urlopen, Request

WV_URL = "https://mxbfffebroitdogmxolp.supabase.co"
WV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NzU2NywiZXhwIjoyMDg4MTUzNTY3fQ.E_bebSkWzdfMRwrlrbwxEsSq7ElmxVzuSCQgJs3fvGE"

# Military callsign prefixes
MIL_PREFIXES = ('RCH','REACH','EVAC','NAVY','TOPCAT','TEAL','JAKE','DUKE',
                'HAWK','DEMON','VIPER','PYTHON','COBRA','REAPER','SKULL',
                'IRON','BLADE','GHOST','BOXER','DARK','FURY','RAGE')

def is_military(ac):
    cs = (ac.get('flight','') or '').strip().upper()
    try:
        hex_val = int(ac.get('hex','0'), 16) if ac.get('hex') else 0
    except ValueError:
        hex_val = 0
    # US military hex ranges
    if 0xae0000 <= hex_val <= 0xae0fff: return True
    if 0xadf000 <= hex_val <= 0xadffff: return True
    if 0xa00001 <= hex_val <= 0xa00fff: return True
    if 0xac0000 <= hex_val <= 0xacffff: return True
    if 0x3f0000 <= hex_val <= 0x3fffff: return True  # UK RAF
    if 0x700000 <= hex_val <= 0x700fff: return True  # Israel
    if any(cs.startswith(p) for p in MIL_PREFIXES): return True
    t = (ac.get('t','') or '').upper()
    if any(x in t for x in ('F16','F15','F35','F22','C17','C130','KC135','B52','B1B','E3','P8','MQ9','RQ4','A10','V22','H60','AH64')): return True
    return False

def post_json(url, headers, data):
    body = json.dumps(data).encode()
    req = Request(url, data=body, headers={**headers, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates'}, method='POST')
    with urlopen(req, timeout=30) as resp:
        return resp.status

def main():
    now = datetime.now(timezone.utc).isoformat()
    headers = {'apikey': WV_KEY, 'Authorization': f'Bearer {WV_KEY}'}

    try:
        with open('/home/p0r0/clawd/projects/worldview/public/flights.json') as f:
            data = json.load(f)
    except Exception as e:
        print(f"[Recorder] No flights.json: {e}")
        return

    aircraft = data.get('aircraft', [])
    if not aircraft:
        print("[Recorder] No aircraft")
        return

    rows = []
    for ac in aircraft:
        if not ac.get('lat') or not ac.get('lon'): continue
        mil = is_military(ac)
        rows.append({
            'captured_at': now,
            'icao24': ac.get('hex', ''),
            'callsign': (ac.get('flight', '') or '').strip(),
            'origin_country': ac.get('r', ''),
            'lat': ac.get('lat'),
            'lon': ac.get('lon'),
            'altitude': ac.get('alt_baro') if ac.get('alt_baro') != 'ground' else 0,
            'velocity': ac.get('gs'),
            'heading': ac.get('track'),
            'vertical_rate': ac.get('baro_rate'),
            'on_ground': ac.get('alt_baro') == 'ground',
            'squawk': ac.get('squawk'),
            'is_military': mil,
        })

    # Batch insert (500 at a time)
    total = 0
    for i in range(0, len(rows), 500):
        batch = rows[i:i+500]
        try:
            post_json(f"{WV_URL}/rest/v1/flight_snapshots", headers, batch)
            total += len(batch)
        except Exception as e:
            print(f"[Recorder] Batch {i} failed: {e}")

    mil_count = sum(1 for r in rows if r['is_military'])
    print(f"[Recorder] Saved {total} aircraft ({mil_count} military) at {now}")

if __name__ == "__main__":
    main()
