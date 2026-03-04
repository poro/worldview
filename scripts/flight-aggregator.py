#!/usr/bin/env python3
"""Server-side flight data aggregator.

Merges OpenSky Network (authenticated, US-heavy) + adsb.fi (global coverage).
Deduplicates by ICAO hex. Writes flights.json every 15s via systemd timer.
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError
from urllib.parse import urlencode

# === OpenSky Network ===

OPENSKY_TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
OPENSKY_STATES_URL = "https://opensky-network.org/api/states/all"
OPENSKY_CLIENT_ID = "endless-api-client"
OPENSKY_CLIENT_SECRET = "2xFeE45Jh9y1osph7ulhsYrIAzBHoMJW"
TOKEN_CACHE = "/tmp/opensky-token.json"


def get_opensky_token() -> str | None:
    try:
        with open(TOKEN_CACHE) as f:
            cached = json.load(f)
            if cached.get("expires_at", 0) > time.time() + 60:
                return cached["access_token"]
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        pass
    try:
        data = urlencode({
            "grant_type": "client_credentials",
            "client_id": OPENSKY_CLIENT_ID,
            "client_secret": OPENSKY_CLIENT_SECRET,
        }).encode()
        req = Request(OPENSKY_TOKEN_URL, data=data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read())
            token_data["expires_at"] = time.time() + token_data.get("expires_in", 1800) - 60
            with open(TOKEN_CACHE, "w") as f:
                json.dump(token_data, f)
            return token_data["access_token"]
    except Exception as e:
        print(f"[OpenSky] Token error: {e}", file=sys.stderr)
        return None


def fetch_opensky(token: str) -> tuple[list, set]:
    """Returns (aircraft_list, seen_hex_set) from OpenSky."""
    try:
        req = Request(OPENSKY_STATES_URL)
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("User-Agent", "WorldView/1.0")
        with urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
            states = data.get("states")
            if not states:
                return [], set()

            aircraft = []
            seen = set()
            for s in states:
                if s[5] is None or s[6] is None:
                    continue
                hex_id = s[0].strip() if s[0] else ""
                if not hex_id:
                    continue
                seen.add(hex_id)
                ac = {
                    "hex": hex_id,
                    "flight": s[1].strip() if s[1] else "",
                    "r": s[2] or "Unknown",
                    "lat": s[6],
                    "lon": s[5],
                    "alt_baro": "ground" if s[8] else (round(s[7] / 0.3048) if s[7] is not None else None),
                    "alt_geom": round(s[13] / 0.3048) if s[13] is not None else None,
                    "gs": round(s[9] / 0.514444, 1) if s[9] is not None else None,
                    "track": s[10],
                    "baro_rate": round(s[11] / 0.00508) if s[11] is not None else None,
                    "squawk": s[14],
                    "_source": "opensky",
                }
                aircraft.append(ac)
            return aircraft, seen
    except Exception as e:
        print(f"[OpenSky] Fetch error: {e}", file=sys.stderr)
        return [], set()


# === adsb.fi (global coverage) ===

REGIONS = [
    {"lat": 40, "lon": -100}, {"lat": 35, "lon": -80}, {"lat": 47, "lon": -120},
    {"lat": 30, "lon": -95}, {"lat": 45, "lon": -73}, {"lat": 33, "lon": -112},
    {"lat": 55, "lon": -100}, {"lat": 25, "lon": -80}, {"lat": 20, "lon": -100},
    {"lat": 51, "lon": 0}, {"lat": 50, "lon": 10}, {"lat": 48, "lon": 20},
    {"lat": 60, "lon": 15}, {"lat": 40, "lon": -4}, {"lat": 42, "lon": 15},
    {"lat": 55, "lon": 37}, {"lat": 35, "lon": 140}, {"lat": 30, "lon": 120},
    {"lat": 22, "lon": 114}, {"lat": 13, "lon": 100}, {"lat": 25, "lon": 55},
    {"lat": 28, "lon": 77}, {"lat": 37, "lon": 127}, {"lat": -34, "lon": 151},
    {"lat": -23, "lon": -46}, {"lat": -34, "lon": 18},
]

ADSB_FI_BASE = "https://opendata.adsb.fi/api/v2/lat/{lat}/lon/{lon}/dist/250"


def fetch_adsbfi(already_seen: set) -> tuple[list, int]:
    """Fetch from adsb.fi, dedup against already_seen. Returns (new_aircraft, regions_ok)."""
    new_aircraft = []
    regions_ok = 0

    for i, region in enumerate(REGIONS):
        url = ADSB_FI_BASE.format(lat=region["lat"], lon=region["lon"])
        try:
            req = Request(url, headers={"User-Agent": "WorldView/1.0"})
            with urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())
                aircraft = data.get("aircraft", data.get("ac", []))
                if aircraft:
                    regions_ok += 1
                    for ac in aircraft:
                        hex_id = ac.get("hex", ac.get("icao24", ""))
                        if hex_id and hex_id not in already_seen:
                            already_seen.add(hex_id)
                            new_aircraft.append(ac)
        except Exception:
            pass
        if i < len(REGIONS) - 1:
            time.sleep(0.15)

    return new_aircraft, regions_ok


# === Main ===

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/home/p0r0/clawd/projects/worldview/public/flights.json")
    args = parser.parse_args()

    start = time.time()
    all_aircraft = []
    sources = []

    # 1. OpenSky (fast, single call, great US coverage)
    token = get_opensky_token()
    seen = set()
    if token:
        opensky_ac, seen = fetch_opensky(token)
        if opensky_ac:
            all_aircraft.extend(opensky_ac)
            sources.append(f"opensky:{len(opensky_ac)}")

    # 2. adsb.fi (fill in global gaps, dedup against OpenSky)
    adsbfi_ac, adsbfi_regions = fetch_adsbfi(seen)
    if adsbfi_ac:
        all_aircraft.extend(adsbfi_ac)
        sources.append(f"adsb.fi:{len(adsbfi_ac)}({adsbfi_regions}/{len(REGIONS)})")

    elapsed = time.time() - start

    result = {
        "now": time.time(),
        "aircraft": all_aircraft,
        "source": "+".join(sources) if sources else "none",
        "regions": f"merged",
        "total_regions": len(REGIONS) + 1,
        "generated": datetime.now(timezone.utc).isoformat(),
    }

    with open(args.output, "w") as f:
        json.dump(result, f)

    print(f"[Flights] {len(all_aircraft)} aircraft ({' + '.join(sources)}) in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
