// ============================================================
// Supabase Client — Fetches Feed data from WorldView backend
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Claim, Narrative, BotNetwork, InfoFogZone } from './types';

const SUPABASE_URL = 'https://mxbfffebroitdogmxolp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc1NjcsImV4cCI6MjA4ODE1MzU2N30.bF6455VlQ50xMz0GS54R7S7ERWA5qpW5-fz-Uq6ziqg';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export async function fetchClaims(scenarioId: string): Promise<Claim[]> {
  try {
    const { data, error } = await getClient()
      .from('claims')
      .select('*')
      .eq('scenario_id', scenarioId);

    if (error) {
      console.warn('[Supabase] Claims fetch error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map(mapDbClaim);
  } catch (e) {
    console.warn('[Supabase] Claims fetch failed:', e);
    return [];
  }
}

export async function fetchNarratives(scenarioId: string): Promise<Narrative[]> {
  try {
    const { data, error } = await getClient()
      .from('narratives')
      .select('*')
      .eq('scenario_id', scenarioId);

    if (error) {
      console.warn('[Supabase] Narratives fetch error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map(mapDbNarrative);
  } catch (e) {
    console.warn('[Supabase] Narratives fetch failed:', e);
    return [];
  }
}

export async function fetchBotNetworks(scenarioId: string): Promise<BotNetwork[]> {
  try {
    const { data, error } = await getClient()
      .from('bot_networks')
      .select('*')
      .eq('scenario_id', scenarioId);

    if (error) {
      console.warn('[Supabase] Bot networks fetch error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map(mapDbBotNetwork);
  } catch (e) {
    console.warn('[Supabase] Bot networks fetch failed:', e);
    return [];
  }
}

export async function fetchFogZones(scenarioId: string): Promise<InfoFogZone[]> {
  try {
    const { data, error } = await getClient()
      .from('info_fog_zones')
      .select('*')
      .eq('scenario_id', scenarioId);

    if (error) {
      console.warn('[Supabase] Fog zones fetch error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map(mapDbFogZone);
  } catch (e) {
    console.warn('[Supabase] Fog zones fetch failed:', e);
    return [];
  }
}

// --- DB row to type mappers ---

function mapDbClaim(row: Record<string, unknown>): Claim {
  const data = (row.data as Record<string, unknown>) || row;
  return data as unknown as Claim;
}

function mapDbNarrative(row: Record<string, unknown>): Narrative {
  const data = (row.data as Record<string, unknown>) || row;
  return data as unknown as Narrative;
}

function mapDbBotNetwork(row: Record<string, unknown>): BotNetwork {
  const data = (row.data as Record<string, unknown>) || row;
  return data as unknown as BotNetwork;
}

function mapDbFogZone(row: Record<string, unknown>): InfoFogZone {
  const data = (row.data as Record<string, unknown>) || row;
  return data as unknown as InfoFogZone;
}
