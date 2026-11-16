import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle as firebaseSignInWithGoogle, logOut } from '../lib/firebase';

export const MASTER_ADMIN_EMAIL = 'codygermain032@gmail.com';
export const OWNER_EMAIL = MASTER_ADMIN_EMAIL;

// Immediately clear any legacy mock keys from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('human_owner_verified_session');
  } catch (e) {
    // Ignore error
  }
}

/**
 * Checks if the current Firebase user is the verified Master Admin (Cody Germain).
 * Only codygermain032@gmail.com returns true. All other users and unauthenticated guests return false.
 */
export function isUserMasterAdmin(user?: User | null): boolean {
  if (!user || !user.email || !user.emailVerified) {
    return false;
  }
  return user.email.toLowerCase().trim() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/** Backwards-compatible alias */
export const isUserOwner = isUserMasterAdmin;

export type UserRole = 'master_admin' | 'member' | 'guest';

/**
 * Hook to track Firebase Google Authentication and Master Admin authorization state.
 */
export function useOwnerAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(() => isUserMasterAdmin(auth.currentUser));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      const isAdm = isUserMasterAdmin(user);
      setIsMasterAdmin(isAdm);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Prompts Google Sign-In via Firebase Auth.
   * If user is codygermain032@gmail.com, grants Master Admin access.
   * Otherwise logs in as authenticated member with standard access.
   */
  const signInWithGoogle = async (): Promise<{ 
    success: boolean; 
    isMasterAdmin: boolean; 
    email?: string; 
    error?: string 
  }> => {
    try {
      setAuthLoading(true);
      const { user } = await firebaseSignInWithGoogle();
      const isAdmin = isUserMasterAdmin(user);
      setCurrentUser(user);
      setIsMasterAdmin(isAdmin);
      return { 
        success: true, 
        isMasterAdmin: isAdmin, 
        email: user?.email || undefined 
      };
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      return { 
        success: false, 
        isMasterAdmin: false, 
        error: err?.message || 'Authentication failed' 
      };
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Signs out the current Firebase user.
   */
  const signOutUser = async () => {
    try {
      setAuthLoading(true);
      await logOut();
      setCurrentUser(null);
      setIsMasterAdmin(false);
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      setAuthLoading(false);
    }
  };

  const userRole: UserRole = isMasterAdmin 
    ? 'master_admin' 
    : (currentUser ? 'member' : 'guest');

  return {
    currentUser,
    authLoading,
    isMasterAdmin,
    isOwner: isMasterAdmin, // alias for backwards compatibility
    isAuthenticated: !!currentUser,
    userRole,
    signInWithGoogle,
    authenticateOwnerWithGoogle: signInWithGoogle, // alias
    signOut: signOutUser,
    lockOwnerSession: signOutUser, // alias
    ownerEmail: MASTER_ADMIN_EMAIL,
    masterAdminEmail: MASTER_ADMIN_EMAIL
  };
}

