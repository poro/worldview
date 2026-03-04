// ============================================================
// FeedManager — Orchestrates the entire Feed layer
// ============================================================

import * as Cesium from 'cesium';
import { TimeController } from '../time/controller';
import { ClaimRenderer } from './claims';
import { PropagationRenderer } from './propagation';
import { Claim, Narrative, BotNetwork, InfoFogZone } from './types';
import {
  EPIC_FURY_CLAIMS,
  EPIC_FURY_NARRATIVES,
  EPIC_FURY_BOT_NETWORKS,
  EPIC_FURY_FOG_ZONES,
} from './scenario-epic-fury';
import { FeedPanel } from '../ui/feed-panel';
import { fetchClaims, fetchNarratives, fetchBotNetworks, fetchFogZones } from './supabase';
import { fetchAllSources } from './sources';

export type FeedMode = 'live' | 'scenario';

export class FeedManager {
  private viewer!: Cesium.Viewer;
  private timeController!: TimeController;
  private claimRenderer!: ClaimRenderer;
  private propagationRenderer!: PropagationRenderer;
  private feedPanel!: FeedPanel;

  private claims: Map<string, Claim> = new Map();
  private narratives: Map<string, Narrative> = new Map();
  private botNetworks: Map<string, BotNetwork> = new Map();
  private fogZones: Map<string, InfoFogZone> = new Map();

  private _feedVisible: boolean = false;
  private _fogVisible: boolean = false;
  private _networksVisible: boolean = false;
  private _mode: FeedMode = 'live';
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private liveRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeTime: (() => void) | null = null;
  private onFlyTo: ((lon: number, lat: number) => void) | null = null;
  private onToast: ((msg: string) => void) | null = null;

  get mode(): FeedMode { return this._mode; }

  get feedVisible(): boolean { return this._feedVisible; }
  get fogVisible(): boolean { return this._fogVisible; }
  get networksVisible(): boolean { return this._networksVisible; }

  setOnFlyTo(cb: (lon: number, lat: number) => void) { this.onFlyTo = cb; }
  setOnToast(cb: (msg: string) => void) { this.onToast = cb; }

  init(viewer: Cesium.Viewer, timeController: TimeController) {
    this.viewer = viewer;
    this.timeController = timeController;

    // Init subsystems
    this.claimRenderer = new ClaimRenderer(viewer);
    this.propagationRenderer = new PropagationRenderer(viewer);
    this.feedPanel = new FeedPanel({
      onClaimClick: (claimId) => this.selectClaim(claimId),
      onModeSwitch: (mode) => this.switchMode(mode),
    });

    // Wire claim click from globe to feed panel
    this.claimRenderer.setOnClaimClick((claimId) => this.selectClaim(claimId));

    // Subscribe to time changes
    this.unsubscribeTime = this.timeController.subscribe(() => {
      this.update();
    });

    // Start update loop for propagation animation
    this.updateInterval = setInterval(() => this.update(), 1000);

    // Pre-render hook for card positioning
    this.viewer.scene.preRender.addEventListener(() => {
      if (this._feedVisible) {
        this.claimRenderer.updateVisibility(this.timeController.getEffectiveTime());
      }
    });
  }

  async loadLive() {
    this._mode = 'live';
    console.log('[FeedManager] Loading live news feed...');

    try {
      const { claims, sources } = await fetchAllSources();
      if (claims.length === 0) {
        console.warn('[FeedManager] No live articles found from any source');
        this.onToast?.('No live articles found — try again shortly');
        return;
      }
      console.log(`[FeedManager] Sources: ${sources.join(', ')}`);

      // Clear existing claims
      for (const [id] of this.claims) {
        this.claimRenderer.removeClaim(id);
      }
      this.claims.clear();

      // Load live claims
      for (const claim of claims) {
        this.claims.set(claim.id, claim);
        this.claimRenderer.addClaim(claim);
      }
      this.feedPanel.setClaims(claims);

      console.log(`[FeedManager] Live feed loaded: ${claims.length} articles`);
      this.onToast?.(`LIVE FEED: ${claims.length} articles loaded`);
    } catch (err) {
      console.error('[FeedManager] Live feed error:', err);
      this.onToast?.('Live feed error — falling back to scenario');
      await this.loadScenario('epic-fury');
    }
  }

  startLiveRefresh(intervalMs: number = 5 * 60 * 1000) {
    this.stopLiveRefresh();
    this.liveRefreshInterval = setInterval(() => {
      if (this._mode === 'live' && this._feedVisible) {
        this.loadLive();
      }
    }, intervalMs);
  }

  stopLiveRefresh() {
    if (this.liveRefreshInterval) {
      clearInterval(this.liveRefreshInterval);
      this.liveRefreshInterval = null;
    }
  }

  async loadScenario(scenarioId: string) {
    this._mode = 'scenario';
    if (scenarioId !== 'epic-fury') {
      console.warn(`[FeedManager] Unknown scenario: ${scenarioId}`);
      return;
    }

    // Try Supabase first, fall back to static data
    let claims: Claim[];
    let narratives: Narrative[];
    let botNets: BotNetwork[];
    let fogData: InfoFogZone[];

    try {
      const [sClaims, sNarratives, sBots, sFog] = await Promise.all([
        fetchClaims(scenarioId),
        fetchNarratives(scenarioId),
        fetchBotNetworks(scenarioId),
        fetchFogZones(scenarioId),
      ]);

      claims = sClaims.length > 0 ? sClaims : EPIC_FURY_CLAIMS;
      narratives = sNarratives.length > 0 ? sNarratives : EPIC_FURY_NARRATIVES;
      botNets = sBots.length > 0 ? sBots : EPIC_FURY_BOT_NETWORKS;
      fogData = sFog.length > 0 ? sFog : EPIC_FURY_FOG_ZONES;

      if (sClaims.length > 0) {
        console.log('[FeedManager] Loaded from Supabase');
      } else {
        console.log('[FeedManager] Supabase empty, using static data');
      }
    } catch {
      console.warn('[FeedManager] Supabase unavailable, using static data');
      claims = EPIC_FURY_CLAIMS;
      narratives = EPIC_FURY_NARRATIVES;
      botNets = EPIC_FURY_BOT_NETWORKS;
      fogData = EPIC_FURY_FOG_ZONES;
    }

    // Load claims
    for (const claim of claims) {
      this.claims.set(claim.id, claim);
      this.claimRenderer.addClaim(claim);
    }

    // Load narratives
    for (const narrative of narratives) {
      this.narratives.set(narrative.id, narrative);
    }

    // Load bot networks
    for (const network of botNets) {
      this.botNetworks.set(network.id, network);
    }

    // Load fog zones
    for (const zone of fogData) {
      this.fogZones.set(zone.id, zone);
    }

    // Update feed panel with claims
    this.feedPanel.setClaims(claims);

    console.log(`[FeedManager] Scenario '${scenarioId}' loaded: ${claims.length} claims, ${narratives.length} narratives, ${botNets.length} bot networks, ${fogData.length} fog zones`);
  }

  update() {
    const currentTime = this.timeController.getEffectiveTime();

    if (this._feedVisible) {
      this.claimRenderer.updateVisibility(currentTime);
      this.propagationRenderer.updateAll(currentTime);
    }
  }

  // --- Layer toggles ---

  toggleFeedLayer() {
    this._feedVisible = !this._feedVisible;
    this.claimRenderer.setVisible(this._feedVisible);
    this.feedPanel.setVisible(this._feedVisible);

    if (this._feedVisible) {
      // Auto-load live feed if no claims loaded yet
      if (this.claims.size === 0) {
        this.loadLive();
      }

      // Start propagation for all loaded claims
      for (const [, claim] of this.claims) {
        this.propagationRenderer.startPropagation(claim);
      }
      this.propagationRenderer.setVisible(true);
      this.startLiveRefresh();
      this.update();
    } else {
      this.propagationRenderer.setVisible(false);
      this.stopLiveRefresh();
    }

    this.onToast?.(this._feedVisible ? 'LIVE FEED ON' : 'LIVE FEED OFF');
  }

  async switchMode(mode: FeedMode) {
    if (mode === this._mode) return;

    // Clear existing claims
    for (const [id] of this.claims) {
      this.claimRenderer.removeClaim(id);
      this.propagationRenderer.stopPropagation(id);
    }
    this.claims.clear();

    if (mode === 'live') {
      this.stopLiveRefresh();
      await this.loadLive();
      this.startLiveRefresh();
      this.onToast?.('SWITCHED TO LIVE FEED');
    } else {
      this.stopLiveRefresh();
      await this.loadScenario('epic-fury');
      // Start propagation for scenario claims
      for (const [, claim] of this.claims) {
        this.propagationRenderer.startPropagation(claim);
      }
      this.onToast?.('SWITCHED TO SCENARIO: EPIC FURY');
    }

    if (this._feedVisible) {
      this.update();
    }
  }

  toggleFogOverlay() {
    this._fogVisible = !this._fogVisible;
    this.onToast?.(this._fogVisible ? 'INFO FOG ON' : 'INFO FOG OFF');
  }

  toggleNetworkGraph() {
    this._networksVisible = !this._networksVisible;
    this.onToast?.(this._networksVisible ? 'BOT NETWORKS ON' : 'BOT NETWORKS OFF');
  }

  // --- Claim interaction ---

  selectClaim(claimId: string) {
    const claim = this.claims.get(claimId);
    if (!claim) return;

    this.claimRenderer.highlightClaim(claimId);
    this.feedPanel.highlightClaim(claimId);

    // Fly to claim origin
    this.onFlyTo?.(claim.origin.lon, claim.origin.lat);
  }

  // --- Stats for HUD ---

  getVisibleClaimCount(): number {
    return this.claimRenderer.getVisibleCount();
  }

  getTotalClaimCount(): number {
    return this.claims.size;
  }

  getActiveNarrativeCount(): number {
    return this.narratives.size;
  }

  getFogZoneCount(): number {
    return this.fogZones.size;
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.stopLiveRefresh();
    if (this.unsubscribeTime) this.unsubscribeTime();
    this.claimRenderer.destroy();
    this.propagationRenderer.destroy();
    this.feedPanel.destroy();
  }
}
