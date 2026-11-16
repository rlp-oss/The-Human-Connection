import { useEffect, useState } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import {
  auth,
  forceRefreshFirebaseToken,
  getAccessTokenExpiry,
  logOut,
} from '../lib/firebase';
import { isUserMasterAdmin } from '../utils/ownerAuth';

export const SESSION_TTL_ALERT_THRESHOLD_SECONDS = 60;

export type JitCredentialStatus = 'active' | 'warning' | 'expired';
export type SessionTtlStateStatus = 'unauthenticated' | 'active' | 'warning_60s' | 'expired';

export interface JitCredentialRecord {
  id: 'firebase_id_token' | 'google_drive_oauth' | 'jit_session_cap';
  label: string;
  provider: string;
  issuedAtMs: number;
  expiresAtMs: number;
  remainingSeconds: number;
  status: JitCredentialStatus;
  autoRenewable: boolean;
}

export interface SessionTtlEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
}

export interface SessionTtlSnapshot {
  isAuthenticated: boolean;
  userEmail: string | null;
  isMasterAdmin: boolean;
  status: SessionTtlStateStatus;
  credentials: JitCredentialRecord[];
  activeExpiresAtMs: number | null;
  issuedAtMs: number | null;
  remainingSeconds: number | null;
  strictWindowSeconds: number | null;
  warningThresholdSeconds: number;
  alertModalOpen: boolean;
  isRenewing: boolean;
  lastRefreshedAtMs: number | null;
  eventsLog: SessionTtlEvent[];
}

function formatTimeIso(ms: number): string {
  return new Date(ms).toISOString();
}

class SessionTtlMonitorService {
  private listeners = new Set<(snap: SessionTtlSnapshot) => void>();
  private initialized = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeAuth: (() => void) | null = null;

  private currentUser: User | null = null;
  private firebaseIssuedAtMs: number | null = null;
  private firebaseExpiresAtMs: number | null = null;
  private strictWindowSeconds: number | null = null;
  private strictCapIssuedAtMs: number | null = null;
  private strictCapExpiresAtMs: number | null = null;

  private alertModalOpen = false;
  private alertDismissedForExpiryMs: number | null = null;
  private expiredTerminationTriggeredForMs: number | null = null;
  private lastStatus: SessionTtlStateStatus = 'unauthenticated';
  private isRenewing = false;
  private lastRefreshedAtMs: number | null = null;
  private eventsLog: SessionTtlEvent[] = [];

  private ensureStarted() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        this.expiredTerminationTriggeredForMs = null;
        await this.syncTokenMetadata(user);
        this.ensureTicker();
      } else {
        this.firebaseIssuedAtMs = null;
        this.firebaseExpiresAtMs = null;
        this.strictCapIssuedAtMs = null;
        this.strictCapExpiresAtMs = null;
        this.alertDismissedForExpiryMs = null;
        this.stopTicker();
        if (this.lastStatus !== 'expired') {
          this.lastStatus = 'unauthenticated';
        }
        this.emit();
      }
    });

    if (auth.currentUser) {
      this.currentUser = auth.currentUser;
      void this.syncTokenMetadata(auth.currentUser);
      this.ensureTicker();
    }
  }

  private async syncTokenMetadata(user: User) {
    try {
      const result = await user.getIdTokenResult(false);
      this.firebaseIssuedAtMs = Date.parse(result.issuedAtTime) || Date.now();
      this.firebaseExpiresAtMs = Date.parse(result.expirationTime) || Date.now() + 3600 * 1000;
      this.pushEvent(
        'info',
        `Loaded JIT identity token (expires ${new Date(this.firebaseExpiresAtMs).toLocaleTimeString()}).`
      );
      this.evaluateTick();
    } catch {
      this.firebaseIssuedAtMs = Date.now();
      this.firebaseExpiresAtMs = Date.now() + 3600 * 1000;
      this.evaluateTick();
    }
  }

  private ensureTicker() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      this.evaluateTick();
    }, 1000);
  }

  private stopTicker() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private pushEvent(level: SessionTtlEvent['level'], message: string) {
    const entry: SessionTtlEvent = {
      id: `ttl_evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatTimeIso(Date.now()),
      level,
      message,
    };
    this.eventsLog = [entry, ...this.eventsLog].slice(0, 15);
  }

  private buildCredentials(now: number): JitCredentialRecord[] {
    if (!this.currentUser) return [];
    const list: JitCredentialRecord[] = [];

    if (this.firebaseExpiresAtMs && this.firebaseIssuedAtMs) {
      const rem = Math.max(0, Math.ceil((this.firebaseExpiresAtMs - now) / 1000));
      list.push({
        id: 'firebase_id_token',
        label: 'Firebase Ephemeral ID Token',
        provider: 'Google Identity / Bearer JWT',
        issuedAtMs: this.firebaseIssuedAtMs,
        expiresAtMs: this.firebaseExpiresAtMs,
        remainingSeconds: rem,
        status: rem <= 0 ? 'expired' : rem <= SESSION_TTL_ALERT_THRESHOLD_SECONDS ? 'warning' : 'active',
        autoRenewable: true,
      });
    }

    const driveExpiry = getAccessTokenExpiry();
    if (driveExpiry) {
      const rem = Math.max(0, Math.ceil((driveExpiry - now) / 1000));
      list.push({
        id: 'google_drive_oauth',
        label: 'Google Drive OAuth Access Token',
        provider: 'Client-Side In-Memory Scope',
        issuedAtMs: driveExpiry - 3600 * 1000,
        expiresAtMs: driveExpiry,
        remainingSeconds: rem,
        status: rem <= 0 ? 'expired' : rem <= SESSION_TTL_ALERT_THRESHOLD_SECONDS ? 'warning' : 'active',
        autoRenewable: false,
      });
    }

    if (this.strictWindowSeconds && this.strictCapExpiresAtMs && this.strictCapIssuedAtMs) {
      const rem = Math.max(0, Math.ceil((this.strictCapExpiresAtMs - now) / 1000));
      list.push({
        id: 'jit_session_cap',
        label: `Strict JIT Ceiling (${this.strictWindowSeconds}s)`,
        provider: 'H.U.M.A.N. Session TTL Policy',
        issuedAtMs: this.strictCapIssuedAtMs,
        expiresAtMs: this.strictCapExpiresAtMs,
        remainingSeconds: rem,
        status: rem <= 0 ? 'expired' : rem <= SESSION_TTL_ALERT_THRESHOLD_SECONDS ? 'warning' : 'active',
        autoRenewable: true,
      });
    }

    return list;
  }

  private evaluateTick() {
    const now = Date.now();
    if (!this.currentUser) {
      this.emit();
      return;
    }

    const credentials = this.buildCredentials(now);
    const activeExpiresAtMs = credentials.reduce<number | null>(
      (min, item) => (min === null || item.expiresAtMs < min ? item.expiresAtMs : min),
      null
    );

    if (activeExpiresAtMs === null) {
      this.emit();
      return;
    }

    const remainingSeconds = Math.max(0, Math.ceil((activeExpiresAtMs - now) / 1000));

    if (remainingSeconds <= 0) {
      if (this.expiredTerminationTriggeredForMs !== activeExpiresAtMs) {
        this.expiredTerminationTriggeredForMs = activeExpiresAtMs;
        this.lastStatus = 'expired';
        this.alertModalOpen = true;
        this.pushEvent('critical', 'JIT credential TTL reached 0s. Session automatically terminated.');
        this.emit();
        void logOut().catch((err) => {
          console.warn('[SessionTTL] Auto-signout failed:', err);
        });
      }
      return;
    }

    if (remainingSeconds <= SESSION_TTL_ALERT_THRESHOLD_SECONDS) {
      if (this.lastStatus !== 'warning_60s') {
        this.lastStatus = 'warning_60s';
        this.pushEvent(
          'warning',
          `Pre-termination threshold reached (${remainingSeconds}s remaining). Alert modal triggered.`
        );
      }
      if (this.alertDismissedForExpiryMs !== activeExpiresAtMs) {
        this.alertModalOpen = true;
      }
    } else {
      this.lastStatus = 'active';
    }

    this.emit();
  }

  public getSnapshot(): SessionTtlSnapshot {
    const now = Date.now();
    const credentials = this.buildCredentials(now);
    const activeExpiresAtMs = credentials.reduce<number | null>(
      (min, item) => (min === null || item.expiresAtMs < min ? item.expiresAtMs : min),
      null
    );
    const issuedAtMs = credentials.reduce<number | null>(
      (max, item) => (max === null || item.issuedAtMs > max ? item.issuedAtMs : max),
      null
    );
    const remainingSeconds =
      activeExpiresAtMs !== null ? Math.max(0, Math.ceil((activeExpiresAtMs - now) / 1000)) : null;

    let status: SessionTtlStateStatus = this.lastStatus;
    if (!this.currentUser) {
      status = this.lastStatus === 'expired' ? 'expired' : 'unauthenticated';
    } else if (remainingSeconds !== null) {
      if (remainingSeconds <= 0) status = 'expired';
      else if (remainingSeconds <= SESSION_TTL_ALERT_THRESHOLD_SECONDS) status = 'warning_60s';
      else status = 'active';
    }

    return {
      isAuthenticated: Boolean(this.currentUser),
      userEmail: this.currentUser?.email || null,
      isMasterAdmin: isUserMasterAdmin(this.currentUser),
      status,
      credentials,
      activeExpiresAtMs,
      issuedAtMs,
      remainingSeconds,
      strictWindowSeconds: this.strictWindowSeconds,
      warningThresholdSeconds: SESSION_TTL_ALERT_THRESHOLD_SECONDS,
      alertModalOpen: this.alertModalOpen,
      isRenewing: this.isRenewing,
      lastRefreshedAtMs: this.lastRefreshedAtMs,
      eventsLog: this.eventsLog,
    };
  }

  public subscribe(listener: (snap: SessionTtlSnapshot) => void): () => void {
    this.ensureStarted();
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  public openModal() {
    this.ensureStarted();
    this.alertModalOpen = true;
    this.emit();
  }

  public dismissAlertModal() {
    const snap = this.getSnapshot();
    if (snap.activeExpiresAtMs) {
      this.alertDismissedForExpiryMs = snap.activeExpiresAtMs;
    }
    if (this.lastStatus === 'expired' && !this.currentUser) {
      this.lastStatus = 'unauthenticated';
    }
    this.alertModalOpen = false;
    this.emit();
  }

  public async renewSession(): Promise<boolean> {
    if (!this.currentUser) return false;
    this.isRenewing = true;
    this.emit();
    try {
      const refreshed = await forceRefreshFirebaseToken();
      const now = Date.now();
      if (refreshed) {
        this.firebaseIssuedAtMs = refreshed.issuedAtMs;
        this.firebaseExpiresAtMs = refreshed.expiresAtMs;
      }
      if (this.strictWindowSeconds) {
        this.strictCapIssuedAtMs = now;
        this.strictCapExpiresAtMs = now + this.strictWindowSeconds * 1000;
      }
      this.lastRefreshedAtMs = now;
      this.alertDismissedForExpiryMs = null;
      this.expiredTerminationTriggeredForMs = null;
      this.lastStatus = 'active';
      this.alertModalOpen = false;
      this.pushEvent('info', 'Rotated ephemeral Firebase JIT credential and reset Session TTL.');
      this.evaluateTick();
      return true;
    } catch (err) {
      this.pushEvent('critical', 'Failed to rotate ephemeral credential; re-authentication may be required.');
      this.emit();
      return false;
    } finally {
      this.isRenewing = false;
      this.emit();
    }
  }

  public setStrictWindowSeconds(seconds: number | null) {
    this.ensureStarted();
    this.strictWindowSeconds = seconds;
    const now = Date.now();
    if (seconds && this.currentUser) {
      this.strictCapIssuedAtMs = now;
      this.strictCapExpiresAtMs = now + seconds * 1000;
      this.alertDismissedForExpiryMs = null;
      this.expiredTerminationTriggeredForMs = null;
      this.pushEvent(
        'info',
        `Applied strict JIT window ceiling (${seconds}s). Pre-termination alert armed at 60s remaining.`
      );
    } else {
      this.strictCapIssuedAtMs = null;
      this.strictCapExpiresAtMs = null;
      this.alertDismissedForExpiryMs = null;
      this.pushEvent('info', 'Restored native Firebase JIT credential TTL window.');
    }
    this.evaluateTick();
  }

  public async terminateSession(): Promise<void> {
    this.alertModalOpen = false;
    this.strictWindowSeconds = null;
    this.strictCapIssuedAtMs = null;
    this.strictCapExpiresAtMs = null;
    this.lastStatus = 'unauthenticated';
    this.pushEvent('warning', 'Operator manually terminated JIT session.');
    await logOut();
    this.emit();
  }
}

export const sessionTtlService = new SessionTtlMonitorService();

export function useSessionTtl() {
  const [snapshot, setSnapshot] = useState<SessionTtlSnapshot>(() => sessionTtlService.getSnapshot());

  useEffect(() => {
    return sessionTtlService.subscribe(setSnapshot);
  }, []);

  return {
    ...snapshot,
    openModal: () => sessionTtlService.openModal(),
    dismissAlertModal: () => sessionTtlService.dismissAlertModal(),
    renewSession: () => sessionTtlService.renewSession(),
    terminateSession: () => sessionTtlService.terminateSession(),
    setStrictWindowSeconds: (seconds: number | null) => sessionTtlService.setStrictWindowSeconds(seconds),
  };
}
