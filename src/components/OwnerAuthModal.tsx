import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Key, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  LogIn, 
  LogOut,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useOwnerAuth } from '../utils/ownerAuth';
import { EmeraldHumanNetworkLogoIcon } from './HumanLogo';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onVerified?: () => void;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onVerified
}) => {
  const { 
    isMasterAdmin, 
    currentUser, 
    masterAdminEmail, 
    signInWithGoogle, 
    signOut 
  } = useOwnerAuth();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    const result = await signInWithGoogle();
    setIsSigningIn(false);

    if (result.success && result.isMasterAdmin) {
      setSuccessMessage('Master Admin verified: Cody Germain (codygermain032@gmail.com). Logo customization unlocked.');
      setTimeout(() => {
        setSuccessMessage(null);
        if (onSuccess) onSuccess();
        if (onVerified) onVerified();
        onClose();
      }, 1200);
    } else if (result.success) {
      setErrorMessage(`Signed in as ${result.email}. Standard member access granted. Master Admin controls are strictly reserved for ${masterAdminEmail}.`);
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify with your Google account.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setSuccessMessage('Signed out successfully.');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#FAF8F5] text-[#2D2926] border border-[#DCD5CA] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E5E0D8] bg-[#F2ECE4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D2926] flex items-center gap-1.5">
                Master Admin Access
                {isMasterAdmin && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#064E3B] border border-[#A7F3D0] font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                    Verified Master Admin
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#6A655C]">Exclusive Authority for {masterAdminEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#FAF8F5] hover:bg-white border border-[#DCD5CA] flex items-center justify-center text-[#6A655C] hover:text-[#2D2926] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          <div className="rounded-xl border border-[#E5E0D8] bg-white p-3.5 text-xs text-[#5A5A40] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#2D2926]">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>Protected Brand Sovereignty</span>
            </div>
            <p className="leading-relaxed">
              Master Admin functions (including modifying logos, brand seals, and C2PA provenance credentials) are restricted strictly to <strong className="text-[#2D2926]">Cody Germain</strong> (<span className="font-mono text-[#059669]">{masterAdminEmail}</span>).
            </p>
            <p className="text-[11px] text-[#8C857B]">
              Public visitors and standard members cannot alter ecosystem logos. Authentication is verified through Google OAuth via Firebase.
            </p>
          </div>

          {isMasterAdmin ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#C5DEC9] text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#059669] text-white flex items-center justify-center mx-auto shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#2D2926]">Master Admin Session Active</h4>
                <p className="text-xs text-[#5A5A40]">
                  Authenticated as <strong className="text-[#064E3B]">{currentUser?.email}</strong>. You have exclusive authorization to customize ecosystem logos and trust seals.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#064E3B] hover:bg-[#043E2E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer text-center"
                >
                  Continue to Customize Logos
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="py-2.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#DCD5CA] text-[#6A655C] hover:text-[#991B1B] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current user status if signed in as non-admin */}
              {currentUser && (
                <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
                  <p className="font-semibold">Currently signed in as: {currentUser.email}</p>
                  <p className="text-[11px]">
                    This Google account does not have Master Admin permissions. Please sign in with <strong className="font-mono">{masterAdminEmail}</strong> to access logo customization.
                  </p>
                </div>
              )}

              {/* Google Sign In Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#DCD5CA] text-xs font-semibold text-[#2D2926] shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{isSigningIn ? 'Verifying with Google...' : 'Sign In with Google Account'}</span>
                </button>
              </div>

              {currentUser && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#DCD5CA] text-[#6A655C] text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch Account / Sign Out</span>
                </button>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B] flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#EBF3ED] border border-[#C5DEC9] text-xs text-[#3D6E50] flex items-center gap-2 animate-fade-in font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
