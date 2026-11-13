import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, Firestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import firebaseConfig from './firebase-applet-config.json';

/**
 * Interface representing an active Hunter in the 15-Chapter Treasure Hunt.
 * Complies with H.U.M.A.N. Protocol Ecosystem Privacy Policy v4.2 (Zero PII Harvesting).
 */
export interface HunterProfile {
  uid: string;
  displayName: string;
  emailHash: string;
  registeredAt: Timestamp | { toDate: () => Date };
  currentChapter: number;
  unlockedKeys: {
    [chapterNumber: number]: {
      decryptedAt: Timestamp | { toDate: () => Date };
      keyUsed: string;
      attemptsCount: number;
    };
  };
  telemetry: {
    lastActiveAt: Timestamp | { toDate: () => Date };
    deviceType: string;
  };
}

const localHunterFallback = new Map<string, HunterProfile>();

export class HunterRegistryService {
  private db: Firestore | null = null;

  private getDbSafe(): Firestore | null {
    if (this.db) return this.db;
    try {
      const app =
        getApps().length === 0
          ? initializeApp({ projectId: firebaseConfig.projectId })
          : getApps()[0];
      this.db = (firebaseConfig as any).firestoreDatabaseId
        ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
        : getFirestore(app);
      return this.db;
    } catch (err) {
      console.warn('[HunterRegistryService] Firestore Admin unavailable, using local session registry.', err);
      return null;
    }
  }

  public async registerOrGetHunter(
    uid: string,
    displayName: string,
    rawEmail: string,
    userAgent: string
  ): Promise<HunterProfile> {
    const emailHash = crypto.createHash('sha256').update(rawEmail.toLowerCase().trim()).digest('hex');
    const db = this.getDbSafe();

    if (db) {
      try {
        const hunterRef = db.collection('hunters').doc(uid);
        return await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(hunterRef);

          if (doc.exists) {
            const currentData = doc.data() as HunterProfile;
            const updatedTelemetry = {
              ...currentData.telemetry,
              lastActiveAt: Timestamp.now(),
            };
            transaction.update(hunterRef, {
              'telemetry.lastActiveAt': Timestamp.now(),
            });
            return {
              ...currentData,
              telemetry: updatedTelemetry,
            };
          }

          const newHunter: HunterProfile = {
            uid,
            displayName: displayName || 'Anonymous Hunter',
            emailHash,
            registeredAt: Timestamp.now(),
            currentChapter: 1,
            unlockedKeys: {},
            telemetry: {
              lastActiveAt: Timestamp.now(),
              deviceType: userAgent.includes('Mobi') ? 'mobile' : 'desktop',
            },
          };

          transaction.set(hunterRef, newHunter);
          return newHunter;
        });
      } catch (err) {
        console.warn('[HunterRegistryService] Falling back to local registry after Firestore error:', err);
      }
    }

    const existing = localHunterFallback.get(uid);
    if (existing) {
      existing.telemetry.lastActiveAt = Timestamp.now();
      return existing;
    }

    const created: HunterProfile = {
      uid,
      displayName: displayName || 'Anonymous Hunter',
      emailHash,
      registeredAt: Timestamp.now(),
      currentChapter: 1,
      unlockedKeys: {},
      telemetry: {
        lastActiveAt: Timestamp.now(),
        deviceType: userAgent.includes('Mobi') ? 'mobile' : 'desktop',
      },
    };
    localHunterFallback.set(uid, created);
    return created;
  }

  public async advanceChapter(
    uid: string,
    chapterSolved: number,
    keyUsed: string,
    attempts: number
  ): Promise<boolean> {
    const db = this.getDbSafe();

    if (db) {
      const hunterRef = db.collection('hunters').doc(uid);
      try {
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(hunterRef);
          if (!doc.exists) {
            throw new Error('Hunter profile does not exist.');
          }

          const currentData = doc.data() as HunterProfile;
          const nextChapter = chapterSolved + 1;
          const targetChapter = Math.max(currentData.currentChapter, nextChapter);

          const updatedKeys = {
            ...currentData.unlockedKeys,
            [chapterSolved]: {
              decryptedAt: Timestamp.now(),
              keyUsed: keyUsed.toLowerCase().trim(),
              attemptsCount: attempts,
            },
          };

          transaction.update(hunterRef, {
            currentChapter: targetChapter,
            unlockedKeys: updatedKeys,
            'telemetry.lastActiveAt': Timestamp.now(),
          });
        });

        return true;
      } catch (error) {
        console.warn(`[Hunter Registry] Firestore advance failed, updating local fallback for ${uid}:`, error);
      }
    }

    const local = localHunterFallback.get(uid) || {
      uid,
      displayName: 'Anonymous Hunter',
      emailHash: 'local',
      registeredAt: Timestamp.now(),
      currentChapter: 1,
      unlockedKeys: {},
      telemetry: {
        lastActiveAt: Timestamp.now(),
        deviceType: 'desktop',
      },
    };
    local.currentChapter = Math.max(local.currentChapter, chapterSolved + 1);
    local.unlockedKeys[chapterSolved] = {
      decryptedAt: Timestamp.now(),
      keyUsed: keyUsed.toLowerCase().trim(),
      attemptsCount: attempts,
    };
    local.telemetry.lastActiveAt = Timestamp.now();
    localHunterFallback.set(uid, local);
    return true;
  }
}
