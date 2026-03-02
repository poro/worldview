export type VesselType = 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'military' | 'tug' | 'pleasure' | 'other';

export interface Vessel {
  mmsi: string;
  name: string;
  type: VesselType;
  aisShipType: number;
  latitude: number;
  longitude: number;
  speed: number;      // knots
  heading: number;     // degrees
  course: number;      // degrees
  destination: string;
  flag: string;
  length: number;      // meters
  width: number;       // meters
  draught: number;     // meters
  lastUpdate: number;  // timestamp
  isMilitary: boolean;
}

export interface AISResponse {
  vessels: Vessel[];
  timestamp: number;
}
