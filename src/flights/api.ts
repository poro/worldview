import { OpenSkyResponse } from './types';

const PROXY = 'https://worldview-proxy.mark-ollila.workers.dev';

export async function fetchFlights(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<OpenSkyResponse> {
  let target = 'https://opensky-network.org/api/states/all';
  if (bounds) {
    const params = new URLSearchParams({
      lamin: bounds.lamin.toString(),
      lomin: bounds.lomin.toString(),
      lamax: bounds.lamax.toString(),
      lomax: bounds.lomax.toString(),
    });
    target += `?${params}`;
  }

  const isDev = import.meta.env.DEV;
  const url = isDev ? '/opensky/api/states/all' + (bounds ? `?${new URLSearchParams({
    lamin: bounds.lamin.toString(),
    lomin: bounds.lomin.toString(),
    lamax: bounds.lamax.toString(),
    lomax: bounds.lomax.toString(),
  })}` : '') : `${PROXY}/?url=${encodeURIComponent(target)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenSky API error: ${response.status}`);
  }
  return response.json();
}
