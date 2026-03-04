#!/usr/bin/env python3
"""Server-side flight data aggregator.

Fetches all 26 adsb.fi regions sequentially, merges results,
writes to a JSON file that the Vite dev server or a static host can serve.

Run every 15 seconds via systemd timer or cron.
Usage: python3 flight-aggregator.py [--output /path/to/flights.json]
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

REGIONS = [
    {"lat": 40, "lon": -100},  # Central US
    {"lat": 35, "lon": -80},   # Southeast US
    {"lat": 47, "lon": -120},  # Pacific NW
    {"lat": 30, "lon": -95},   # Gulf Coast
    {"lat": 45, "lon": -73},   # Northeast US/Canada
    {"lat": 33, "lon": -112},  # Southwest US
    {"lat": 55, "lon": -100},  # Central Canada
    {"lat": 25, "lon": -80},   # Florida/Caribbean
    {"lat": 20, "lon": -100},  # Mexico
    {"lat": 51, "lon": 0},     # UK/France
    {"lat": 50, "lon": 10},    # Central Europe
    {"lat": 48, "lon": 20},    # Eastern Europe
    {"lat": 60, "lon": 15},    # Scandinavia
    {"lat": 40, "lon": -4},    # Iberia
    {"lat": 42, "lon": 15},    # Mediterranean
    {"lat": 55, "lon": 37},    # Russia West
    {"lat": 35, "lon": 140},   # Japan
    {"lat": 30, "lon": 120},   # East China
    {"lat": 22, "lon": 114},   # Hong Kong/SE Asia
    {"lat": 13, "lon": 100},   # Thailand
    {"lat": 25, "lon": 55},    # Middle East
    {"lat": 28, "lon": 77},    # India
    {"lat": 37, "lon": 127},   # Korea
    {"lat": -34, "lon": 151},  # Australia
    {"lat": -23, "lon": -46},  # Brazil
    {"lat": -34, "lon": 18},   # South Africa
]

ADSB_FI_BASE = "https://opendata.adsb.fi/api/v2/lat/{lat}/lon/{lon}/dist/250"
TIMEOUT = 12  # seconds per request
DELAY = 0.5   # seconds between requests (be polite)


def fetch_region(lat: int, lon: int) -> list:
    url = ADSB_FI_BASE.format(lat=lat, lon=lon)
    try:
        req = Request(url, headers={"User-Agent": "WorldView/1.0"})
        with urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            return data.get("aircraft", data.get("ac", []))
    except (URLError, json.JSONDecodeError, TimeoutError) as e:
        return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/home/p0r0/clawd/projects/worldview/public/flights.json")
    args = parser.parse_args()

    start = time.time()
    seen = set()
    all_aircraft = []
    success_count = 0

    for i, region in enumerate(REGIONS):
        aircraft = fetch_region(region["lat"], region["lon"])
        if aircraft:
            success_count += 1
            for ac in aircraft:
                hex_id = ac.get("hex", ac.get("icao24", ""))
                if hex_id and hex_id not in seen:
                    seen.add(hex_id)
                    all_aircraft.append(ac)
        if i < len(REGIONS) - 1:
            time.sleep(DELAY)

    elapsed = time.time() - start

    result = {
        "now": time.time(),
        "aircraft": all_aircraft,
        "regions": success_count,
        "total_regions": len(REGIONS),
        "generated": datetime.now(timezone.utc).isoformat(),
    }

    with open(args.output, "w") as f:
        json.dump(result, f)

    print(f"[Flights] {len(all_aircraft)} aircraft from {success_count}/{len(REGIONS)} regions in {elapsed:.1f}s → {args.output}")


if __name__ == "__main__":
    main()
