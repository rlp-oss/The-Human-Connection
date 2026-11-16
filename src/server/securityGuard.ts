import crypto from "crypto";
import dns from "dns/promises";
import fs from "fs";
import net from "net";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";

export const MASTER_ADMIN_EMAIL = "codygermain032@gmail.com";

export interface AuthenticatedRequest extends Request {
  authUser?: DecodedIdToken;
}

// =========================================================================
// 1. Ephemeral Firebase ID Token Verification (Eliminate Standing Secrets)
// =========================================================================
function ensureFirebaseAdminInitialized(): boolean {
  try {
    if (getAdminApps().length > 0) return true;
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) return false;
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as { projectId?: string };
    if (!raw.projectId) return false;
    initializeAdminApp({ projectId: raw.projectId });
    return true;
  } catch (err) {
    console.warn("[AGENT-DEFENSE] Firebase Admin initialization warning:", err);
    return false;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = String(req.headers.authorization || "");
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 20 && token.length < 8192 ? token : null;
}

export async function verifyFirebaseBearerToken(req: Request): Promise<DecodedIdToken | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  if (!ensureFirebaseAdminInitialized()) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded || decoded.email_verified !== true) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function isMasterAdminToken(decoded?: DecodedIdToken | null): boolean {
  return Boolean(
    decoded &&
      decoded.email_verified === true &&
      typeof decoded.email === "string" &&
      decoded.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
  );
}

export function requireVerifiedUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  verifyFirebaseBearerToken(req)
    .then((decoded) => {
      if (!decoded) {
        recordAnomalyEvent(getClientIp(req), "auth_failure");
        res.status(401).json({
          ok: false,
          error: "Ephemeral verified Firebase Bearer token required",
        });
        return;
      }
      req.authUser = decoded;
      next();
    })
    .catch(() => {
      res.status(401).json({ ok: false, error: "Token verification failed" });
    });
}

export function requireMasterAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  verifyFirebaseBearerToken(req)
    .then((decoded) => {
      if (!decoded) {
        recordAnomalyEvent(getClientIp(req), "auth_failure");
        res.status(401).json({
          ok: false,
          error: "Master Admin verified Firebase Bearer token required",
        });
        return;
      }
      if (!isMasterAdminToken(decoded)) {
        recordAnomalyEvent(getClientIp(req), "privilege_probe");
        res.status(403).json({
          ok: false,
          error: "Forbidden: Master Admin authority required",
        });
        return;
      }
      req.authUser = decoded;
      next();
    })
    .catch(() => {
      res.status(403).json({ ok: false, error: "Forbidden" });
    });
}

// Fail-closed secret resolver in production; explicit warning + ephemeral random in dev if unset
let ephemeralDevOmegaSecret: string | null = null;
export function resolveOmegaGatewaySecret(): string {
  const configured = process.env.OMEGA_GATEWAY_SECRET?.trim();
  if (configured && configured !== "MY_SHARED_OMEGA_GATEWAY_SECRET") {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("OMEGA_GATEWAY_SECRET must be configured in production");
  }
  if (!ephemeralDevOmegaSecret) {
    ephemeralDevOmegaSecret = crypto.randomBytes(32).toString("hex");
    console.warn("[AGENT-DEFENSE] OMEGA_GATEWAY_SECRET not set; generated ephemeral dev signing key.");
  }
  return ephemeralDevOmegaSecret;
}

// =========================================================================
// 2. East-West Micro-Segmentation & SSRF / Outbound Egress Guardrails
// =========================================================================
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "169.254.169.254",
  "100.100.100.200",
]);

const TRUSTED_LOGO_HOST_SUFFIXES = [
  "drive.google.com",
  "lh3.googleusercontent.com",
  "raw.githubusercontent.com",
  "ai.studio",
  "run.app",
];

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (net.isIPv4(normalized)) {
    return isPrivateOrReservedIpv4(normalized);
  }
  if (net.isIPv6(normalized)) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);
      return net.isIPv4(mapped) ? isPrivateOrReservedIpv4(mapped) : true;
    }
    return false;
  }
  return true;
}

function hostMatchesAllowlist(hostname: string, suffixes: string[]): boolean {
  const h = hostname.toLowerCase();
  return suffixes.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
}

export async function assertSafeOutboundUrl(
  rawUrl: string,
  options: { requireHttps?: boolean; allowlistSuffixes?: string[] } = {}
): Promise<URL> {
  const parsed = new URL(rawUrl.trim());
  const requireHttps = options.requireHttps ?? true;

  if (requireHttps && parsed.protocol !== "https:") {
    throw new Error("Only HTTPS outbound URLs are permitted");
  }
  if (!requireHttps && parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Unsupported URL protocol");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Embedded URL credentials are forbidden");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Outbound destination hostname is blocked by micro-segmentation policy");
  }

  if (options.allowlistSuffixes && !hostMatchesAllowlist(hostname, options.allowlistSuffixes)) {
    throw new Error(`Host '${hostname}' is not in the outbound egress allowlist`);
  }

  if (net.isIP(hostname) !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("Direct private or metadata IP addresses are blocked");
    }
    return parsed;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error("Unable to resolve outbound hostname");
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error("Resolved destination IP falls within a blocked internal/metadata network");
    }
  }

  return parsed;
}

export function getLogoProxyAllowlist(): string[] {
  return TRUSTED_LOGO_HOST_SUFFIXES;
}

export function isTrustedRedirectUrl(rawUrl: string, extraTrustedOrigins: string[]): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && parsed.hostname === "localhost")) {
      return false;
    }
    if (parsed.username || parsed.password) return false;
    const origin = parsed.origin.toLowerCase();
    if (extraTrustedOrigins.some((allowed) => allowed && origin === allowed.toLowerCase())) {
      return true;
    }
    return hostMatchesAllowlist(parsed.hostname, ["ai.studio", "run.app"]);
  } catch {
    return false;
  }
}

// =========================================================================
// 3. Behavioral Risk, Machine-Speed Velocity & Anomaly Quarantine
// =========================================================================
interface RateBucket {
  timestamps: number[];
}

interface AnomalyTracker {
  events: number[];
  quarantinedUntil: number;
}

const rateBuckets = new Map<string, RateBucket>();
const anomalyTrackers = new Map<string, AnomalyTracker>();

export function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function recordAnomalyEvent(ip: string, kind: "auth_failure" | "privilege_probe" | "ssrf_probe"): void {
  const now = Date.now();
  const tracker = anomalyTrackers.get(ip) || { events: [], quarantinedUntil: 0 };
  tracker.events = tracker.events.filter((t) => now - t < 60_000);
  tracker.events.push(now);

  // Instant quarantine on SSRF attempts or machine-speed auth/privilege enumeration
  if (kind === "ssrf_probe" || tracker.events.length >= 15) {
    tracker.quarantinedUntil = now + 5 * 60_000;
    console.warn(`[AGENT-DEFENSE] Quarantined ${ip} for 5m (${kind}, events=${tracker.events.length})`);
  }
  anomalyTrackers.set(ip, tracker);
}

export function createBehavioralRateLimiter(options: {
  group: string;
  windowMs: number;
  maxRequests: number;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const now = Date.now();

    const tracker = anomalyTrackers.get(ip);
    if (tracker && tracker.quarantinedUntil > now) {
      res.status(429).json({
        ok: false,
        error: "Temporarily blocked due to anomalous request velocity or security policy violation",
        retryAfterSec: Math.ceil((tracker.quarantinedUntil - now) / 1000),
      });
      return;
    }

    const key = `${options.group}:${ip}`;
    const bucket = rateBuckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);

    if (bucket.timestamps.length >= options.maxRequests) {
      res.status(429).json({
        ok: false,
        error: `Rate limit exceeded for ${options.group}. Slow down automated requests.`,
      });
      return;
    }

    bucket.timestamps.push(now);
    rateBuckets.set(key, bucket);
    next();
  };
}

// =========================================================================
// 4. Agentic Trust Exchange: Prompt Sanitization & Output DLP Guardrails
// =========================================================================
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /disregard\s+(all\s+)?(system|developer)\s+(prompt|instructions)/gi,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|env|secrets?)/gi,
  /```[\s\S]*?```/g,
];

export function sanitizeUntrustedPromptInput(value: unknown, maxLen: number = 1000): string {
  let str = typeof value === "string" ? value : JSON.stringify(value ?? "");
  str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  for (const pattern of INJECTION_PATTERNS) {
    str = str.replace(pattern, "[REDACTED_DIRECTIVE]");
  }
  str = str.replace(/<\/?untrusted_input>/gi, "");
  if (str.length > maxLen) {
    str = str.slice(0, maxLen);
  }
  return str.trim();
}

const SENSITIVE_TOKEN_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{20,}/g,
  /sk_(live|test)_[0-9A-Za-z]{16,}/g,
  /ghp_[0-9A-Za-z]{20,}/g,
  /eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/g,
];

export function redactSensitiveTokens<T>(input: T): T {
  if (typeof input === "string") {
    let out: string = input;
    for (const pat of SENSITIVE_TOKEN_PATTERNS) {
      out = out.replace(pat, "[REDACTED_CREDENTIAL]");
    }
    return out as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveTokens(item)) as unknown as T;
  }
  if (input && typeof input === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      clean[k] = redactSensitiveTokens(v);
    }
    return clean as T;
  }
  return input;
}
