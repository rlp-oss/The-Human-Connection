/**
 * H.U.M.A.N. Cleanroom SDK v3.0.0-cleanroom
 * Node 22 native type-stripping compatible (no enums, no namespaces, no parameter properties).
 */

export const SDK_VERSION = '3.0.0-cleanroom';
export const DEFAULT_OMEGA_APP_URL =
  'https://human-initiative-omega-799079571356.us-west1.run.app';
export const DEFAULT_CORRIDOR = 'Global Pool C ($FOOD / $MED)';
export const DEFAULT_RAIL = 'canada-rtr';
export const C2PA_ATTESTATION_STANDARDS = ['C2PA-JUMBF-v2.1', 'EU-AI-ACT-ART-50-53'] as const;
export const CONTRIBUTOR_ROLES = ['$FOOD', '$MED', '$CREW', 'Developer'] as const;

export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

export type FleetAppId =
  | 'human-hub'
  | 'tome-crafter'
  | 'forge-os'
  | 'rlm-pro-studio'
  | 'rl-easy-flow'
  | 'rlmv-editor';

export interface FleetAppDescriptor {
  appId: FleetAppId;
  name: string;
  code: string;
  description: string;
  appUrl?: string;
}

export const FLEET_APPS_REGISTRY: Record<FleetAppId, FleetAppDescriptor> = {
  'human-hub': {
    appId: 'human-hub',
    name: 'H.U.M.A.N. Sovereign Hub',
    code: 'FT-ETHIC-HUB-2026',
    description: 'Core H.U.M.A.N. Governance, Compliance & 50% Covenant Clearinghouse',
    appUrl: 'https://humanethicalai.ai.studio',
  },
  'tome-crafter': {
    appId: 'tome-crafter',
    name: 'Tome Crafter',
    code: 'FT-ETHIC-TOME-2026',
    description: 'Ethical Narrative & Knowledge Graph Authoring Studio',
    appUrl: 'https://tomecrafter-ai-book-studio.ai.studio',
  },
  'forge-os': {
    appId: 'forge-os',
    name: 'Forge OS',
    code: 'FT-ETHIC-FORGE-2026',
    description: 'Cleanroom Sovereign Developer Workspace & Agent Runtime',
    appUrl: 'https://reforgeos-live.ai.studio',
  },
  'rlm-pro-studio': {
    appId: 'rlm-pro-studio',
    name: 'RLM Pro Studio',
    code: 'FT-ETHIC-RLMPRO-2026',
    description: 'Recursive Learning Model Orchestration & Telemetry Workbench',
    appUrl: 'https://rlm-pro-studio.ai.studio',
  },
  'rl-easy-flow': {
    appId: 'rl-easy-flow',
    name: 'RL Easy Flow',
    code: 'FT-ETHIC-RLFLOW-2026',
    description: 'Visual Policy & Workflow Synthesis Pipeline',
    appUrl: 'https://rl-easy-flow.ai.studio',
  },
  'rlmv-editor': {
    appId: 'rlmv-editor',
    name: 'RLMV Music Video Editor',
    code: 'FT-ETHIC-RLMV-VIDEO-2026',
    description: 'AI-Assisted Music Video Timeline & C2PA Verification Editor',
    appUrl: '',
  },
};

export function resolveFleetApp(appId?: string): FleetAppDescriptor {
  if (appId && appId in FLEET_APPS_REGISTRY) {
    return FLEET_APPS_REGISTRY[appId as FleetAppId];
  }
  return FLEET_APPS_REGISTRY['human-hub'];
}

export interface CovenantSplitResult {
  grossUsd: number;
  opsInfraUsd: number;
  societyFundUsd: number;
  poolACreatorsUsd: number;
  poolBStewardsUsd: number;
  poolCHumanitarianUsd: number;
  opsPct: number;
  societyPct: number;
  poolAPctOfSociety: number;
  poolBPctOfSociety: number;
  poolCPctOfSociety: number;
  poolAPctOfGross: number;
  poolBPctOfGross: number;
  poolCPctOfGross: number;
  corridor: string;
  sdkVersion: string;
}

export interface CovenantSplitCentsResult {
  grossCents: number;
  opsInfraCents: number;
  societyFundCents: number;
  poolACreatorsCents: number;
  poolBStewardsCents: number;
  poolCHumanitarianCents: number;
  corridor: string;
  sdkVersion: string;
}

/**
 * Enforces exact 50% People's Covenant split:
 * - 50% Infrastructure & Ops (gross * 0.50)
 * - 50% Society Covenant Fund (gross - ops):
 *   - Pool A Creators: 70% of Society Fund (35% of gross)
 *   - Pool B Stewards & Commons: 15% of Society Fund (7.5% of gross)
 *   - Pool C Humanitarian Aid ($FOOD / $MED): 15% of Society Fund (7.5% of gross)
 */
export function computeCovenantSplit(grossAmount: number): CovenantSplitResult {
  const safeGross = Number.isFinite(grossAmount) && grossAmount > 0 ? grossAmount : 0;
  const grossUsd = Math.round(safeGross * 100) / 100;
  const opsInfraUsd = Math.round(grossUsd * 0.50 * 100) / 100;
  const societyFundUsd = Math.round((grossUsd - opsInfraUsd) * 100) / 100;

  const poolACreatorsUsd = Math.round(societyFundUsd * 0.70 * 100) / 100;
  const poolBStewardsUsd = Math.round(societyFundUsd * 0.15 * 100) / 100;
  const poolCHumanitarianUsd = Math.round(
    (societyFundUsd - poolACreatorsUsd - poolBStewardsUsd) * 100
  ) / 100;

  return {
    grossUsd,
    opsInfraUsd,
    societyFundUsd,
    poolACreatorsUsd,
    poolBStewardsUsd,
    poolCHumanitarianUsd,
    opsPct: 50,
    societyPct: 50,
    poolAPctOfSociety: 70,
    poolBPctOfSociety: 15,
    poolCPctOfSociety: 15,
    poolAPctOfGross: 35,
    poolBPctOfGross: 7.5,
    poolCPctOfGross: 7.5,
    corridor: DEFAULT_CORRIDOR,
    sdkVersion: SDK_VERSION,
  };
}

export function computeCovenantSplitCents(grossCentsInput: number): CovenantSplitCentsResult {
  const grossCents = Math.max(0, Math.round(Number(grossCentsInput) || 0));
  const opsInfraCents = Math.round(grossCents * 0.5);
  const societyFundCents = grossCents - opsInfraCents;
  const poolACreatorsCents = Math.round(societyFundCents * 0.7);
  const poolBStewardsCents = Math.round(societyFundCents * 0.15);
  const poolCHumanitarianCents = societyFundCents - poolACreatorsCents - poolBStewardsCents;

  return {
    grossCents,
    opsInfraCents,
    societyFundCents,
    poolACreatorsCents,
    poolBStewardsCents,
    poolCHumanitarianCents,
    corridor: DEFAULT_CORRIDOR,
    sdkVersion: SDK_VERSION,
  };
}

export interface C2paArtifactManifest {
  artifactId: string;
  appId: FleetAppId;
  code: string;
  sdkVersion: string;
  corridor: string;
  standards: readonly string[];
  sha256: string;
  timestamp: string;
  title: string;
  artifactType: string;
  payloadSummary?: string;
  covenantSplit?: CovenantSplitResult;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto SubtleCrypto is unavailable in this runtime.');
  }
  const encoded = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signArtifactC2pa(
  payload: unknown,
  options?: {
    appId?: string;
    title?: string;
    artifactType?: string;
    corridor?: string;
    grossUsd?: number;
  }
): Promise<C2paArtifactManifest> {
  const app = resolveFleetApp(options?.appId);
  const timestamp = new Date().toISOString();
  const artifactId = `c2pa_${app.appId}_${Date.now().toString(36)}`;
  const corridor = options?.corridor || DEFAULT_CORRIDOR;

  const canonical = stableStringify({
    artifactId,
    appId: app.appId,
    code: app.code,
    sdkVersion: SDK_VERSION,
    standards: C2PA_ATTESTATION_STANDARDS,
    corridor,
    timestamp,
    payload,
  });
  const sha256 = await sha256Hex(canonical);

  return {
    artifactId,
    appId: app.appId,
    code: app.code,
    sdkVersion: SDK_VERSION,
    corridor,
    standards: C2PA_ATTESTATION_STANDARDS,
    sha256,
    timestamp,
    title: options?.title || `${app.name} Signed Deliverable`,
    artifactType: options?.artifactType || 'deliverable',
    covenantSplit:
      typeof options?.grossUsd === 'number' ? computeCovenantSplit(options.grossUsd) : undefined,
  };
}

export interface OmegaDeliverableSyncResponse {
  ok: boolean;
  manifest: C2paArtifactManifest;
  syncedToOmega: boolean;
  omegaEndpoint: string;
  omegaStatus?: number;
}

export async function syncDeliverableToOmega(
  payload: unknown,
  options?: {
    appId?: string;
    title?: string;
    artifactType?: string;
    corridor?: string;
    grossUsd?: number;
  }
): Promise<OmegaDeliverableSyncResponse> {
  const manifest = await signArtifactC2pa(payload, options);
  const res = await fetch('/api/omega/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: manifest.appId,
      code: manifest.code,
      corridor: manifest.corridor,
      manifest,
      payload,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to sync deliverable to Omega (${res.status})`);
  }
  return (await res.json()) as OmegaDeliverableSyncResponse;
}

export interface OmegaCheckoutRequest {
  app?: string;
  plan: string;
  target?: string;
  amountCents: number;
  email?: string;
  userId?: string;
  corridor?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface OmegaCheckoutResponse {
  ok: boolean;
  url: string;
  sessionId: string;
  params: Record<string, string>;
}

export async function createSignedOmegaCheckout(
  req: OmegaCheckoutRequest
): Promise<OmegaCheckoutResponse> {
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : '';
  const returnUrl =
    req.returnUrl ||
    `${origin}/?omega_status=success&tier=${encodeURIComponent(req.plan)}`;
  const cancelUrl = req.cancelUrl || `${origin}/?omega_status=cancelled`;

  const res = await fetch('/api/omega/sign-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app: req.app || 'human-hub',
      plan: req.plan,
      target: req.target || req.plan,
      amount_cents: req.amountCents,
      email: req.email || '',
      user_id: req.userId || '',
      corridor: req.corridor || DEFAULT_CORRIDOR,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to sign Omega checkout URL: ${errText}`);
  }
  return (await res.json()) as OmegaCheckoutResponse;
}

export function getOmegaAppUrl(): string {
  try {
    const envObj = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (envObj?.VITE_OMEGA_APP_URL) {
      return envObj.VITE_OMEGA_APP_URL.replace(/\/$/, '');
    }
  } catch {
    // Fallback to default outside Vite context
  }
  return DEFAULT_OMEGA_APP_URL;
}
