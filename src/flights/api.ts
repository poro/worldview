import { OpenSkyResponse } from './types';

export async function fetchFlights(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<OpenSkyResponse> {
  let url = '/opensky/api/states/all';
  if (bounds) {
    const params = new URLSearchParams({
      lamin: bounds.lamin.toString(),
      lomin: bounds.lomin.toString(),
      lamax: bounds.lamax.toString(),
      lomax: bounds.lomax.toString(),
    });
    url += `?${params}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenSky API error: ${response.status}`);
  }
  return response.json();
}
