export interface TLERecord {
  name: string;
  line1: string;
  line2: string;
  category: string;
}

const isDev = import.meta.env.DEV;
const PROXY = 'https://worldview-proxy.mark-ollila.workers.dev';

function tleUrl(group: string): string {
  const target = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
  return isDev ? `/celestrak/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle` : `${PROXY}/?url=${encodeURIComponent(target)}`;
}

const TLE_URLS: Record<string, string> = {
  stations: tleUrl('stations'),
  starlink: tleUrl('starlink'),
  military: tleUrl('military'),
  weather: tleUrl('weather'),
  gps: tleUrl('gps-ops'),
};

export async function fetchTLEs(category: string): Promise<TLERecord[]> {
  const url = TLE_URLS[category];
  if (!url) throw new Error(`Unknown TLE category: ${category}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`CelesTrak error: ${response.status}`);

  const text = await response.text();
  return parseTLEText(text, category);
}

export function parseTLEText(text: string, category: string): TLERecord[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const records: TLERecord[] = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (line1?.startsWith('1 ') && line2?.startsWith('2 ')) {
      records.push({ name, line1, line2, category });
    }
  }

  return records;
}

export function getNoradId(tle: TLERecord): string {
  return tle.line1.substring(2, 7).trim();
}
