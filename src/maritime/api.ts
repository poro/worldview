import { Vessel, VesselType, AISResponse } from './types';
import { isMilitaryVessel } from './military';
import { PROXY_URL } from '../config';

// AIS ship type code to VesselType mapping
function aisTypeToVesselType(typeCode: number): VesselType {
  if (typeCode === 35 || typeCode === 55) return 'military';
  if (typeCode >= 70 && typeCode <= 79) return 'cargo';
  if (typeCode >= 80 && typeCode <= 89) return 'tanker';
  if (typeCode >= 60 && typeCode <= 69) return 'passenger';
  if (typeCode === 30) return 'fishing';
  if (typeCode === 31 || typeCode === 32) return 'tug';
  if (typeCode === 36 || typeCode === 37) return 'pleasure';
  if (typeCode >= 40 && typeCode <= 49) return 'pleasure'; // HSC often pleasure
  if (typeCode >= 50 && typeCode <= 59) return 'other'; // pilot, SAR, etc
  return 'other';
}

// Parse MarineTraffic-style JSON response
function parseMarineTrafficData(data: any): AISResponse {
  const rows = data?.data?.rows || data?.rows || data?.data || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return { vessels: [], timestamp: Date.now() };
  }

  const vessels: Vessel[] = [];
  for (const row of rows) {
    try {
      const mmsi = String(row.MMSI || row.mmsi || row[0] || '');
      if (!mmsi || mmsi.length < 9) continue;

      const lat = parseFloat(row.LAT || row.lat || row[1] || 0);
      const lon = parseFloat(row.LON || row.lon || row[2] || 0);
      if (lat === 0 && lon === 0) continue;
      if (isNaN(lat) || isNaN(lon)) continue;

      const aisType = parseInt(row.SHIP_TYPE || row.ship_type || row.type || row[3] || 0);
      const name = String(row.SHIPNAME || row.shipname || row.name || row[4] || 'UNKNOWN');
      const speed = parseFloat(row.SPEED || row.speed || row[5] || 0) / 10; // often in 10ths of knot
      const heading = parseFloat(row.HEADING || row.heading || row[7] || 0);
      const course = parseFloat(row.COURSE || row.course || row[6] || heading);
      const dest = String(row.DESTINATION || row.destination || row[8] || '');
      const flag = String(row.FLAG || row.flag || row[9] || '');
      const length = parseFloat(row.LENGTH || row.length || row[10] || 0);
      const width = parseFloat(row.WIDTH || row.width || row[11] || 0);
      const draught = parseFloat(row.DRAUGHT || row.draught || row[12] || 0);

      let vesselType = aisTypeToVesselType(aisType);
      const milCheck = isMilitaryVessel(mmsi, aisType, name);
      if (milCheck) vesselType = 'military';

      vessels.push({
        mmsi,
        name: name.trim(),
        type: vesselType,
        aisShipType: aisType,
        latitude: lat,
        longitude: lon,
        speed: isNaN(speed) ? 0 : speed,
        heading: isNaN(heading) ? 0 : heading,
        course: isNaN(course) ? 0 : course,
        destination: dest.trim(),
        flag: flag.trim(),
        length: isNaN(length) ? 0 : length,
        width: isNaN(width) ? 0 : width,
        draught: isNaN(draught) ? 0 : draught,
        lastUpdate: Date.now(),
        isMilitary: milCheck,
      });
    } catch {
      continue;
    }
  }

  return { vessels, timestamp: Date.now() };
}

// Parse generic AIS JSON (array of vessel objects)
function parseGenericAIS(data: any): AISResponse {
  // Handle array format directly
  const items = Array.isArray(data) ? data : (data?.vessels || data?.ships || data?.data || []);
  if (!Array.isArray(items) || items.length === 0) {
    return { vessels: [], timestamp: Date.now() };
  }

  const vessels: Vessel[] = [];
  for (const item of items) {
    try {
      const mmsi = String(item.mmsi || item.MMSI || '');
      if (!mmsi || mmsi.length < 9) continue;

      const lat = parseFloat(item.lat || item.latitude || item.LAT || 0);
      const lon = parseFloat(item.lon || item.longitude || item.LON || 0);
      if ((lat === 0 && lon === 0) || isNaN(lat) || isNaN(lon)) continue;

      const aisType = parseInt(item.shipType || item.ship_type || item.type || item.SHIP_TYPE || 0);
      const name = String(item.name || item.shipName || item.SHIPNAME || 'UNKNOWN');
      const speed = parseFloat(item.speed || item.sog || item.SPEED || 0);
      const heading = parseFloat(item.heading || item.hdg || item.HEADING || 0);
      const course = parseFloat(item.course || item.cog || item.COURSE || heading);
      const dest = String(item.destination || item.dest || item.DESTINATION || '');
      const flag = String(item.flag || item.country || item.FLAG || '');

      let vesselType = aisTypeToVesselType(aisType);
      const milCheck = isMilitaryVessel(mmsi, aisType, name);
      if (milCheck) vesselType = 'military';

      vessels.push({
        mmsi,
        name: name.trim(),
        type: vesselType,
        aisShipType: aisType,
        latitude: lat,
        longitude: lon,
        speed: isNaN(speed) ? 0 : speed,
        heading: isNaN(heading) ? 0 : heading,
        course: isNaN(course) ? 0 : course,
        destination: dest.trim(),
        flag: flag.trim(),
        length: parseFloat(item.length || item.LENGTH || 0) || 0,
        width: parseFloat(item.width || item.WIDTH || 0) || 0,
        draught: parseFloat(item.draught || item.DRAUGHT || 0) || 0,
        lastUpdate: Date.now(),
        isMilitary: milCheck,
      });
    } catch {
      continue;
    }
  }

  return { vessels, timestamp: Date.now() };
}

// AIS data fetch regions — major shipping lanes
const AIS_REGIONS = [
  { name: 'N. Atlantic', lat: 40, lon: -40 },
  { name: 'English Channel', lat: 50, lon: 0 },
  { name: 'Mediterranean', lat: 37, lon: 15 },
  { name: 'Persian Gulf', lat: 26, lon: 52 },
  { name: 'S. China Sea', lat: 15, lon: 112 },
  { name: 'Malacca Strait', lat: 3, lon: 101 },
  { name: 'E. Pacific', lat: 35, lon: -125 },
  { name: 'Gulf of Mexico', lat: 27, lon: -90 },
  { name: 'Baltic', lat: 58, lon: 20 },
  { name: 'Japan', lat: 34, lon: 135 },
];

async function fetchAISRegion(lat: number, lon: number, zoom: number): Promise<any> {
  // Try MarineTraffic public endpoint pattern
  const tileX = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

  const target = `https://www.marinetraffic.com/getData/get_data_json_4/z:${zoom}/X:${tileX}/Y:${tileY}/station:0`;
  const url = `${PROXY_URL}/?url=${encodeURIComponent(target)}`;

  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

export async function fetchVessels(): Promise<AISResponse> {
  try {
    const results = await Promise.allSettled(
      AIS_REGIONS.map(r => fetchAISRegion(r.lat, r.lon, 3))
    );

    const allVessels: Vessel[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const data = result.value;

      // Try MarineTraffic format first, then generic
      let parsed = parseMarineTrafficData(data);
      if (parsed.vessels.length === 0) {
        parsed = parseGenericAIS(data);
      }

      for (const vessel of parsed.vessels) {
        if (!seen.has(vessel.mmsi)) {
          seen.add(vessel.mmsi);
          allVessels.push(vessel);
        }
      }
    }

    console.log(`[WORLDVIEW] Maritime: ${allVessels.length} vessels from ${AIS_REGIONS.length} regions`);
    return { vessels: allVessels, timestamp: Date.now() };
  } catch (e) {
    console.error('Maritime fetch failed:', e);
    return { vessels: [], timestamp: Date.now() };
  }
}
