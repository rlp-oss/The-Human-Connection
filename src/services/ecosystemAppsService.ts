import { getFirebaseAuthHeaders } from '../lib/firebase';

export interface EcosystemAppEntry {
  id: string;
  name: string;
  appId: string;
  vertical: string;
  appUrl?: string;
  iconType: 'book' | 'music' | 'code' | 'video';
  healthScore: number;
  status: 'Optimal' | 'Warning' | 'Delinquent' | 'Unlinked';
  activationState: 'ACTIVE' | 'PENDING' | 'CONFIGURING';
  c2paHash: string;
  ftAuditId: string;
  storyIpId: string;
  royaltyBalance: number;
  lastAudited: string;
  checkpoints: {
    cleanroomCertified: boolean;
    c2paJumbfBound: boolean;
    royaltyFunded: boolean;
    personhoodVerified: boolean;
    regulatoryCompliant: boolean;
  };
  metrics: {
    totalInferences: string;
    royaltiesStreamedUsd: number;
    creatorsAttributed: number;
  };
}

export const ECOSYSTEM_STORAGE_KEY = 'human_app_integrations_v7';
export const ECOSYSTEM_UPDATED_EVENT = 'human-ecosystem-apps-updated';

export const DEFAULT_ECOSYSTEM_APPS: EcosystemAppEntry[] = [
  {
    id: 'app_pub_01',
    name: 'Tome Crafter',
    appId: 'tomecrafter-ai-book-studio',
    vertical: 'Complete Book Creation & Publishing Suite',
    appUrl: 'https://tomecrafter-ai-book-studio.ai.studio',
    iconType: 'book',
    healthScore: 100,
    status: 'Optimal',
    activationState: 'ACTIVE',
    c2paHash: '0x8a92e109ff8b432a76cd1154e2098bca4401889c1048b',
    ftAuditId: 'FT-ETHIC-TOMECRAFTER-2026',
    storyIpId: '0x33b4...tome77',
    royaltyBalance: 185.00,
    lastAudited: '2026-08-18 21:40 UTC',
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: '48,200 chapters & manuscripts synthesized',
      royaltiesStreamedUsd: 1420.80,
      creatorsAttributed: 410,
    },
  },
  {
    id: 'app_rlm_02',
    name: 'RLM Pro Studio',
    appId: 'rlm-pro-studio',
    vertical: 'Hybrid Audio Production Suite',
    appUrl: 'https://rlm-pro-studio.ai.studio',
    iconType: 'music',
    healthScore: 100,
    status: 'Optimal',
    activationState: 'ACTIVE',
    c2paHash: '0x4f1b88e10c29a877bf4356e29910ac772189d9804b219',
    ftAuditId: 'FT-ETHIC-RLM-AUDIO-2026',
    storyIpId: '0x9E83...audio99',
    royaltyBalance: 310.00,
    lastAudited: '2026-08-18 21:35 UTC',
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: '22,600 audio stems & mixes synthesized',
      royaltiesStreamedUsd: 2840.50,
      creatorsAttributed: 512,
    },
  },
  {
    id: 'app_bld_03',
    name: 'ReForgeOS App Builder & Tester',
    appId: 'forgeos-app-builder-tester',
    vertical: 'Open-Source Code AST Engine & Tester Console (Independent App)',
    appUrl: 'https://reforgeos-live.ai.studio',
    iconType: 'code',
    healthScore: 100,
    status: 'Optimal',
    activationState: 'ACTIVE',
    c2paHash: '0x93de66a8710fa44029ce11082bb4901cb00192e441890',
    ftAuditId: 'FT-ETHIC-FORGEOS-APPBUILDER-2026',
    storyIpId: '0x11ce...code44',
    royaltyBalance: 250.00,
    lastAudited: '2026-08-18 21:30 UTC',
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: '118,500 code completions & tests',
      royaltiesStreamedUsd: 3410.00,
      creatorsAttributed: 720,
    },
  },
  {
    id: 'app_vid_04',
    name: 'RL Easy Flow',
    appId: 'rl-easy-flow',
    vertical: 'AI-Powered Video Generation Studio',
    appUrl: 'https://rl-easy-flow.ai.studio',
    iconType: 'video',
    healthScore: 100,
    status: 'Optimal',
    activationState: 'ACTIVE',
    c2paHash: '0x22ab8991fc33910ebf778103418ba09c1189ac3409112',
    ftAuditId: 'FT-ETHIC-RL-EASY-FLOW-2026',
    storyIpId: '0x55ef...flow11',
    royaltyBalance: 220.00,
    lastAudited: '2026-08-18 21:25 UTC',
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: '14,250 video scenes synthesized',
      royaltiesStreamedUsd: 2180.50,
      creatorsAttributed: 286,
    },
  },
  {
    id: 'app_omega_05',
    name: 'Omega App',
    appId: 'omega-app',
    vertical: 'Sovereign Direct-Rail /pay & Omega Protocol v3.0.0-cleanroom Hub',
    appUrl: 'https://human-initiative-omega-799079571356.us-west1.run.app',
    iconType: 'code',
    healthScore: 100,
    status: 'Optimal',
    activationState: 'ACTIVE',
    c2paHash: '0x7c44ab109ee201ff882100a3c41908ee11004a2b89c01',
    ftAuditId: 'FT-ETHIC-OMEGA-2026',
    storyIpId: '0x77om...ega05',
    royaltyBalance: 0.00,
    lastAudited: '2026-11-13 08:30 UTC',
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: 'Live Sovereign Direct-Rail Clearinghouse',
      royaltiesStreamedUsd: 0.00,
      creatorsAttributed: 180,
    },
  },
  {
    id: 'app_rlmv_06',
    name: 'RLMV Music Video Editor',
    appId: 'rlmv-editor',
    vertical: 'AI-Assisted Music Video Timeline & C2PA Studio',
    appUrl: '',
    iconType: 'video',
    healthScore: 100,
    status: 'Unlinked',
    activationState: 'PENDING',
    c2paHash: '0x66cd9012fe44110abc882104519dc02b7718ea320114',
    ftAuditId: 'FT-ETHIC-RLMV-VIDEO-2026',
    storyIpId: '0x88mv...vid06',
    royaltyBalance: 0.00,
    lastAudited: 'Pending URL Binding',
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: false,
      royaltyFunded: false,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: 'Awaiting independent deployment URL',
      royaltiesStreamedUsd: 0.00,
      creatorsAttributed: 0,
    },
  },
];

export function loadCachedEcosystemApps(): EcosystemAppEntry[] {
  try {
    const raw = localStorage.getItem(ECOSYSTEM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load cached ecosystem apps:', err);
  }
  return DEFAULT_ECOSYSTEM_APPS;
}

export function saveCachedEcosystemApps(apps: EcosystemAppEntry[]): void {
  try {
    localStorage.setItem(ECOSYSTEM_STORAGE_KEY, JSON.stringify(apps));
    window.dispatchEvent(new CustomEvent(ECOSYSTEM_UPDATED_EVENT, { detail: apps }));
  } catch (err) {
    console.warn('Failed to save cached ecosystem apps:', err);
  }
}

export async function fetchEcosystemApps(): Promise<EcosystemAppEntry[]> {
  try {
    const res = await fetch('/api/ecosystem/apps');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.apps) && data.apps.length > 0) {
        saveCachedEcosystemApps(data.apps);
        return data.apps;
      }
    }
  } catch (err) {
    console.warn('Ecosystem apps API unavailable, using local cache:', err);
  }
  return loadCachedEcosystemApps();
}

export async function upsertEcosystemApp(
  payload: Partial<EcosystemAppEntry> & { name: string; appId: string }
): Promise<EcosystemAppEntry[]> {
  try {
    const authHeaders = await getFirebaseAuthHeaders();
    const res = await fetch('/api/ecosystem/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.apps)) {
        saveCachedEcosystemApps(data.apps);
        return data.apps;
      }
    }
  } catch (err) {
    console.warn('Failed to persist app to server, updating local cache:', err);
  }

  const current = loadCachedEcosystemApps();
  const cleanUrl = payload.appUrl?.trim() || '';
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const idx = current.findIndex((a) => a.id === payload.id || a.appId === payload.appId);
  const nextEntry: EcosystemAppEntry = {
    id: payload.id || `app_${Date.now().toString(36)}`,
    name: payload.name.trim(),
    appId: payload.appId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
    vertical: payload.vertical?.trim() || 'Independent Ecosystem Application',
    appUrl: cleanUrl,
    iconType: payload.iconType || 'code',
    healthScore: cleanUrl ? 100 : 0,
    status: cleanUrl ? 'Optimal' : 'Unlinked',
    activationState: cleanUrl ? 'ACTIVE' : 'PENDING',
    c2paHash: payload.c2paHash || `0x${Date.now().toString(16)}c2pa${payload.appId.slice(0, 6)}`,
    ftAuditId: payload.ftAuditId || `FT-ETHIC-${payload.appId.toUpperCase()}-2026`,
    storyIpId: payload.storyIpId || `0x${Date.now().toString(16).slice(-4)}...ip`,
    royaltyBalance: payload.royaltyBalance ?? 0,
    lastAudited: cleanUrl ? nowUtc : 'Pending URL Binding',
    checkpoints: payload.checkpoints || {
      cleanroomCertified: true,
      c2paJumbfBound: Boolean(cleanUrl),
      royaltyFunded: Boolean(cleanUrl),
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: payload.metrics || {
      totalInferences: cleanUrl ? 'Live independent deployment' : 'Awaiting independent deployment URL',
      royaltiesStreamedUsd: 0,
      creatorsAttributed: 0,
    },
  };

  const updated = idx >= 0
    ? current.map((a, i) => (i === idx ? { ...a, ...nextEntry } : a))
    : [...current, nextEntry];

  saveCachedEcosystemApps(updated);
  return updated;
}

export async function removeEcosystemApp(id: string): Promise<EcosystemAppEntry[]> {
  try {
    const authHeaders = await getFirebaseAuthHeaders();
    const res = await fetch(`/api/ecosystem/apps/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.apps)) {
        saveCachedEcosystemApps(data.apps);
        return data.apps;
      }
    }
  } catch (err) {
    console.warn('Failed to delete app on server:', err);
  }
  const updated = loadCachedEcosystemApps().filter((a) => a.id !== id && a.appId !== id);
  saveCachedEcosystemApps(updated);
  return updated;
}

export async function pingEcosystemAppUrl(url: string): Promise<{
  reachable: boolean;
  statusCode: number;
  latencyMs: number;
  checkedAt: string;
  error?: string;
}> {
  const authHeaders = await getFirebaseAuthHeaders();
  const res = await fetch('/api/ecosystem/ping-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ url }),
  });
  return res.json();
}
