// ============================================================
// Seed Script — Populate Supabase with Epic Fury scenario data
// Run: npx tsx scripts/seed-feed-data.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mxbfffebroitdogmxolp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc1NjcsImV4cCI6MjA4ODE1MzU2N30.bF6455VlQ50xMz0GS54R7S7ERWA5qpW5-fz-Uq6ziqg';

// Import scenario data — use dynamic import since this is a script
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Dynamic imports for the scenario data
  const { EPIC_FURY_CLAIMS } = await import('../src/feed/scenario-epic-fury');
  const { EPIC_FURY_NARRATIVES } = await import('../src/feed/scenario-epic-fury');
  const { EPIC_FURY_BOT_NETWORKS } = await import('../src/feed/scenario-epic-fury');
  const { EPIC_FURY_FOG_ZONES } = await import('../src/feed/scenario-epic-fury');

  const scenarioId = 'epic-fury';

  console.log('Seeding Epic Fury scenario data...');

  // --- Ensure scenario exists ---
  console.log('  Upserting scenario...');
  const { error: scenarioErr } = await supabase
    .from('scenarios')
    .upsert({
      id: scenarioId,
      name: 'Operation Epic Fury',
      description: 'US/Israel strikes on Iranian nuclear facilities — information warfare scenario',
      start_time: '2026-02-28T00:00:00Z',
      end_time: '2026-03-03T00:00:00Z',
    }, { onConflict: 'id' });

  if (scenarioErr) {
    console.warn('  Scenario upsert warning:', scenarioErr.message);
    console.log('  (Table may not exist yet — continuing with data tables)');
  }

  // --- Seed Claims ---
  console.log(`  Seeding ${EPIC_FURY_CLAIMS.length} claims...`);
  for (const claim of EPIC_FURY_CLAIMS) {
    const { error } = await supabase
      .from('claims')
      .upsert({
        id: claim.id,
        scenario_id: scenarioId,
        data: claim,
      }, { onConflict: 'id' });

    if (error) {
      console.warn(`  Claim ${claim.id} error:`, error.message);
    }
  }

  // --- Seed Narratives ---
  console.log(`  Seeding ${EPIC_FURY_NARRATIVES.length} narratives...`);
  for (const narrative of EPIC_FURY_NARRATIVES) {
    const { error } = await supabase
      .from('narratives')
      .upsert({
        id: narrative.id,
        scenario_id: scenarioId,
        data: narrative,
      }, { onConflict: 'id' });

    if (error) {
      console.warn(`  Narrative ${narrative.id} error:`, error.message);
    }
  }

  // --- Seed Bot Networks ---
  console.log(`  Seeding ${EPIC_FURY_BOT_NETWORKS.length} bot networks...`);
  for (const network of EPIC_FURY_BOT_NETWORKS) {
    const { error } = await supabase
      .from('bot_networks')
      .upsert({
        id: network.id,
        scenario_id: scenarioId,
        data: network,
      }, { onConflict: 'id' });

    if (error) {
      console.warn(`  Bot network ${network.id} error:`, error.message);
    }
  }

  // --- Seed Fog Zones ---
  console.log(`  Seeding ${EPIC_FURY_FOG_ZONES.length} fog zones...`);
  for (const zone of EPIC_FURY_FOG_ZONES) {
    const { error } = await supabase
      .from('info_fog_zones')
      .upsert({
        id: zone.id,
        scenario_id: scenarioId,
        data: zone,
      }, { onConflict: 'id' });

    if (error) {
      console.warn(`  Fog zone ${zone.id} error:`, error.message);
    }
  }

  console.log('Seed complete!');
}

main().catch(console.error);
