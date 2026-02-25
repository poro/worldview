import { OpenSkyResponse } from './types';

export async function fetchFlights(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<OpenSkyResponse> {
  const isDev = import.meta.env.DEV;
  let url: string;
  if (isDev) {
    url = '/opensky/api/states/all';
    if (bounds) {
      const params = new URLSearchParams({
        lamin: bounds.lamin.toString(),
        lomin: bounds.lomin.toString(),
        lamax: bounds.lamax.toString(),
        lomax: bounds.lomax.toString(),
      });
      url += `?${params}`;
    }
  } else {
    const params = new URLSearchParams();
    if (bounds) {
      params.set('lamin', bounds.lamin.toString());
      params.set('lomin', bounds.lomin.toString());
      params.set('lamax', bounds.lamax.toString());
      params.set('lomax', bounds.lomax.toString());
    }
    url = `/api/opensky${params.toString() ? '?' + params : ''}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenSky API error: ${response.status}`);
  }
  return response.json();
}
