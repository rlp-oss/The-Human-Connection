import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  LogOut, 
  Palette, 
  User as UserIcon, 
  ChevronDown, 
  Lock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useOwnerAuth, MASTER_ADMIN_EMAIL } from '../utils/ownerAuth';

interface GoogleAuthButtonProps {
  onOpenCustomBadgeModal?: () => void;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onOpenCustomBadgeModal,
  className = ''
}) => {
  const { 
    currentUser, 
    authLoading, 
    isMasterAdmin, 
    userRole, 
    signInWithGoogle, 
    signOut 
  } = useOwnerAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setInProgress(true);
    const result = await signInWithGoogle();
    setInProgress(false);
    if (!result.success && result.error) {
      setAuthError(result.error);
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  if (authLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#142320] border border-[#DCD5CA] dark:border-[#1E3A33] text-xs font-mono text-[#8C857B] animate-pulse">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
        <span className="hidden sm:inline">Verifying...</span>
      </div>
    );
  }

  // 1. Not Authenticated: Render Google Sign In / Sign Up CTA
  if (!currentUser) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={inProgress}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#142320] hover:bg-[#FAF8F5] dark:hover:bg-[#1E3A33] border border-[#DCD5CA] dark:border-[#1E3A33] text-xs font-semibold text-[#2D2926] dark:text-[#F0FDF4] shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          title="Sign in or Sign up with your Google account"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span className="hidden sm:inline">
            {inProgress ? 'Signing in...' : 'Sign In with Google'}
          </span>
          <span className="sm:hidden font-mono">
            {inProgress ? '...' : 'Sign In'}
          </span>
        </button>

        {authError && (
          <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/90 border border-[#FCA5A5] text-[11px] text-[#991B1B] dark:text-[#FEE2E2] shadow-lg z-50 animate-fade-in">
            {authError}
          </div>
        )}
      </div>
    );
  }

  // 2. Authenticated: Master Admin (codygermain032@gmail.com) OR Standard Member
  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  const photoURL = currentUser.photoURL;

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
          isMasterAdmin
            ? 'bg-[#EBF3ED] dark:bg-[#064E3B]/40 hover:bg-[#DDF0E1] dark:hover:bg-[#064E3B]/60 border-[#A7F3D0] dark:border-[#059669] text-[#064E3B] dark:text-[#34D399]'
            : 'bg-white dark:bg-[#142320] hover:bg-[#FAF8F5] dark:hover:bg-[#1E3A33] border-[#DCD5CA] dark:border-[#1E3A33] text-[#2D2926] dark:text-[#F0FDF4]'
        }`}
        title={isMasterAdmin ? 'Master Admin Profile & Ecosystem Controls' : 'Google Account Profile'}
      >
        {photoURL ? (
          <img 
            src={photoURL} 
            alt={displayName} 
            className="w-5 h-5 rounded-full object-cover border border-emerald-500/40 shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex items-center gap-1">
          {isMasterAdmin ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#064E3B] dark:text-[#34D399] tracking-tight">
              <Crown className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
              <span className="hidden md:inline">Master Admin</span>
              <span className="md:hidden">Admin</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-[#2D2926] dark:text-[#F0FDF4] max-w-[100px] truncate hidden sm:inline">
              {displayName}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Profile & Permissions Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#101B18] border border-[#DCD5CA] dark:border-[#1E3A33] shadow-xl p-4 z-50 text-left animate-fade-in space-y-3.5">
          {/* User Info Header */}
          <div className="flex items-start gap-3 pb-3 border-b border-[#E5E0D8] dark:border-[#1E3A33]">
            {photoURL ? (
              <img 
                src={photoURL} 
                alt={displayName} 
                className="w-11 h-11 rounded-full object-cover border-2 border-[#10B981] shadow-2xs shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#059669] text-white flex items-center justify-center text-base font-bold shadow-2xs shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-[#2D2926] dark:text-[#F0FDF4] truncate">
                  {displayName}
                </h4>
                {isMasterAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    <Crown className="w-3 h-3 text-[#D97706] fill-[#D97706]" />
                    Master Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                    Member
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6A655C] dark:text-[#94A3B8] font-mono truncate mt-0.5">
                {currentUser.email}
              </p>
            </div>
          </div>

          {/* Role Explanation Card */}
          {isMasterAdmin ? (
            <div className="p-2.5 rounded-xl bg-[#EBF3ED] dark:bg-[#064E3B]/20 border border-[#A7F3D0] dark:border-[#059669]/40 text-xs text-[#064E3B] dark:text-[#34D399] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                <span>Verified Master Admin</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#2D2926] dark:text-[#F0FDF4]/80">
                You have exclusive authority over ecosystem logos, trust badges, C2PA configurations, and payout vaults.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#142320] border border-[#E5E0D8] dark:border-[#1E3A33] text-xs text-[#6A655C] dark:text-[#94A3B8] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#2D2926] dark:text-[#F0FDF4]">
                <Lock className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Standard Member Access</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Master Admin functions (such as customizing ecosystem logos and seals) are restricted exclusively to <strong className="text-[#059669] font-mono">{MASTER_ADMIN_EMAIL}</strong>.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-1">
            {isMasterAdmin && onOpenCustomBadgeModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomBadgeModal();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#064E3B] hover:bg-[#043E2E] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Customize Logos & Brand Seals</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#142320] hover:bg-[#F2ECE4] dark:hover:bg-[#1E3A33] border border-[#DCD5CA] dark:border-[#1E3A33] text-xs font-semibold text-[#6A655C] dark:text-[#94A3B8] hover:text-[#991B1B] dark:hover:text-[#F87171] transition-all cursor-pointer"
            >
              <span>Sign Out of Google</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
