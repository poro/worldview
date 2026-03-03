// ============================================================
// Seed Script — Populate Supabase with Epic Fury scenario data
// Run: npx tsx scripts/seed-feed-data.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mxbfffebroitdogmxolp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NzU2NywiZXhwIjoyMDg4MTUzNTY3fQ.E_bebSkWzdfMRwrlrbwxEsSq7ElmxVzuSCQgJs3fvGE';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { EPIC_FURY_CLAIMS, EPIC_FURY_NARRATIVES, EPIC_FURY_BOT_NETWORKS, EPIC_FURY_FOG_ZONES } = await import('../src/feed/scenario-epic-fury');

  const scenarioId = 'epic-fury';
  console.log('Seeding Epic Fury scenario data...');

  // --- Claims ---
  console.log(`  Seeding ${EPIC_FURY_CLAIMS.length} claims...`);
  for (const c of EPIC_FURY_CLAIMS) {
    const { error } = await supabase.from('claims').upsert({
      id: c.id,
      scenario_id: scenarioId,
      headline: c.headline,
      body: c.body,
      media_type: c.mediaType,
      media_url: c.mediaUrl ?? null,
      info_event_type: c.infoEventType,
      misinfo_taxonomy: c.misinfoTaxonomy,
      truth_score: c.truthScore,
      severity_tier: c.severityTier,
      origin_lat: c.origin.lat,
      origin_lon: c.origin.lon,
      target_lat: c.targetLocation?.lat ?? null,
      target_lon: c.targetLocation?.lon ?? null,
      propagation_radius: c.propagationRadius,
      timestamp: c.timestamp,
      peak_timestamp: c.peakTimestamp ?? null,
      decay_timestamp: c.decayTimestamp ?? null,
      correction_timestamp: c.correctionTimestamp ?? null,
      verification_status: c.verificationStatus,
      ground_truth_summary: c.groundTruthSummary,
      source: c.source,
      amplifiers: c.amplifiers,
      propagation: c.propagation,
      reach: c.reach,
      evidence_links: c.evidenceLinks,
      linked_ground_truth_event_id: c.linkedGroundTruthEventId ?? null,
    }, { onConflict: 'id' });
    if (error) console.warn(`  Claim ${c.id}: ${error.message}`);
    else console.log(`  ✅ ${c.id}: ${c.headline.substring(0, 60)}`);
  }

  // --- Narratives ---
  console.log(`  Seeding ${EPIC_FURY_NARRATIVES.length} narratives...`);
  for (const n of EPIC_FURY_NARRATIVES) {
    const { error } = await supabase.from('narratives').upsert({
      id: n.id,
      scenario_id: scenarioId,
      title: n.title,
      summary: n.summary,
      linked_event_ids: n.linkedEventIds,
      linked_claim_ids: n.linkedClaimIds,
      origin: n.origin,
      first_seen: n.firstSeen,
      dominance_start: n.dominancePeriod?.start ?? null,
      dominance_end: n.dominancePeriod?.end ?? null,
      competing_narrative_ids: n.competingNarrativeIds,
      truth_alignment: n.truthAlignment,
    }, { onConflict: 'id' });
    if (error) console.warn(`  Narrative ${n.id}: ${error.message}`);
    else console.log(`  ✅ ${n.id}: ${n.title}`);
  }

  // --- Bot Networks ---
  console.log(`  Seeding ${EPIC_FURY_BOT_NETWORKS.length} bot networks...`);
  for (const b of EPIC_FURY_BOT_NETWORKS) {
    const { error } = await supabase.from('bot_networks').upsert({
      id: b.id,
      scenario_id: scenarioId,
      name: b.name,
      attributed_to: b.attributedTo ?? null,
      node_count: b.nodeCount,
      platforms: b.platforms,
      primary_lat: b.primaryLocation.lat,
      primary_lon: b.primaryLocation.lon,
      nodes: b.nodes,
      active_start: b.activePeriod.start,
      active_end: b.activePeriod.end,
      target_claim_ids: b.targetClaimIds,
      detection_confidence: b.detectionConfidence,
    }, { onConflict: 'id' });
    if (error) console.warn(`  Bot network ${b.id}: ${error.message}`);
    else console.log(`  ✅ ${b.id}: ${b.name}`);
  }

  // --- Fog Zones ---
  console.log(`  Seeding ${EPIC_FURY_FOG_ZONES.length} fog zones...`);
  for (const f of EPIC_FURY_FOG_ZONES) {
    const { error } = await supabase.from('info_fog_zones').upsert({
      id: f.id,
      scenario_id: scenarioId,
      name: f.name,
      center_lat: f.center.lat,
      center_lon: f.center.lon,
      radius_km: f.radiusKm,
      fog_level: f.fogLevel,
      cause: f.cause,
      active_start: f.activePeriod.start,
      active_end: f.activePeriod.end,
      description: f.description,
    }, { onConflict: 'id' });
    if (error) console.warn(`  Fog zone ${f.id}: ${error.message}`);
    else console.log(`  ✅ ${f.id}: ${f.name}`);
  }

  console.log('\nSeed complete!');
}

main().catch(console.error);
