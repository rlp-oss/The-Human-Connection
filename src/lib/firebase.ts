import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must include firestoreDatabaseId
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Add Google Workspace / Drive scopes
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

// In-memory token cache (never stored in localStorage/sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt: number | null = null;
let isSigningIn = false;

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessTokenExpiresAt && Date.now() >= cachedAccessTokenExpiresAt) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = null;
    return null;
  }
  return cachedAccessToken;
};

export const getAccessTokenExpiry = (): number | null => {
  return cachedAccessToken ? cachedAccessTokenExpiresAt : null;
};

export const setCachedAccessToken = (token: string | null, ttlSeconds: number = 3600) => {
  cachedAccessToken = token;
  cachedAccessTokenExpiresAt = token ? Date.now() + ttlSeconds * 1000 : null;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firestore connection verified successfully');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firestore is running in offline/cached mode.');
    }
    return false;
  }
}

export async function signInWithGoogle(): Promise<{ user: any; accessToken: string | null }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      cachedAccessTokenExpiresAt = Date.now() + 3600 * 1000;
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    console.error('Google Sign In Error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export async function logOut() {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = null;
  return signOut(auth);
}

export async function getFirebaseAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const idToken = await user.getIdToken();
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  } catch {
    return {};
  }
}

export async function forceRefreshFirebaseToken(): Promise<{
  idToken: string;
  issuedAtMs: number;
  expiresAtMs: number;
} | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdToken(true);
  const result = await user.getIdTokenResult();
  return {
    idToken,
    issuedAtMs: Date.parse(result.issuedAtTime) || Date.now(),
    expiresAtMs: Date.parse(result.expirationTime) || Date.now() + 3600 * 1000,
  };
}
