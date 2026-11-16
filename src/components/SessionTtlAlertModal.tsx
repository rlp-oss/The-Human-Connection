import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useSessionTtl } from '../services/sessionTtlService';
import { signInWithGoogle } from '../lib/firebase';

export function formatDurationMmSs(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0) return '--:--';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatClock(ms: number | null): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const SessionTtlNavbarIndicator: React.FC = () => {
  const { isAuthenticated, status, remainingSeconds, openModal } = useSessionTtl();

  if (!isAuthenticated && status !== 'expired') {
    return null;
  }

  const isWarning = status === 'warning_60s';
  const isExpired = status === 'expired';

  return (
    <button
      type="button"
      onClick={openModal}
      className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
        isExpired
          ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold'
          : isWarning
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-semibold'
            : 'bg-white dark:bg-[#142320] border-[#DCD5CA] dark:border-[#1E3A33] text-[#2D2926] dark:text-[#A7F3D0] hover:bg-[#F2ECE4] dark:hover:bg-[#1E3A33]'
      }`}
      title="Open Session TTL & JIT Credential Monitor"
    >
      {isExpired ? (
        <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
      ) : isWarning ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      )}
      <span>
        {isExpired ? 'TTL Expired' : `TTL ${formatDurationMmSs(remainingSeconds)}`}
      </span>
    </button>
  );
};

export const SessionTtlAlertModal: React.FC = () => {
  const {
    isAuthenticated,
    userEmail,
    isMasterAdmin,
    status,
    credentials,
    activeExpiresAtMs,
    remainingSeconds,
    strictWindowSeconds,
    warningThresholdSeconds,
    alertModalOpen,
    isRenewing,
    eventsLog,
    dismissAlertModal,
    renewSession,
    terminateSession,
    setStrictWindowSeconds,
  } = useSessionTtl();

  if (!alertModalOpen) return null;

  const isWarning = status === 'warning_60s';
  const isExpired = status === 'expired';

  const handleReauthenticate = async () => {
    try {
      await signInWithGoogle();
      dismissAlertModal();
    } catch {
      // User closed popup or declined
    }
  };

  const jitWindows: Array<{ label: string; seconds: number | null }> = [
    { label: 'Native Token (60m)', seconds: null },
    { label: '15m JIT', seconds: 900 },
    { label: '5m JIT', seconds: 300 },
    { label: '65s Alert Test', seconds: 65 },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-ttl-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-[#101B18] border border-neutral-200 dark:border-[#1E3A33] text-neutral-900 dark:text-[#F0FDF4] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-[#1E3A33] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-lg border shrink-0 ${
                isExpired
                  ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                  : isWarning
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {isExpired ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h2
                id="session-ttl-modal-title"
                className="text-base font-semibold tracking-tight text-neutral-900 dark:text-[#F0FDF4]"
              >
                {isExpired
                  ? 'Session Terminated — JIT Credentials Expired'
                  : isWarning
                    ? 'Session Termination Imminent'
                    : 'Session TTL & JIT Credential Monitor'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-[#94A3B8]">
                <span>{userEmail || 'No active session'}</span>
                <span aria-hidden="true">·</span>
                <span>{isMasterAdmin ? 'Master Admin' : isAuthenticated ? 'Verified Member' : 'Signed Out'}</span>
                <span aria-hidden="true">·</span>
                <span>Alert Threshold: {warningThresholdSeconds}s</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissAlertModal}
            className="p-2 rounded-lg text-neutral-500 dark:text-[#94A3B8] hover:text-neutral-900 dark:hover:text-[#F0FDF4] hover:bg-neutral-100 dark:hover:bg-[#142320] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            aria-label="Close Session TTL modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Primary Countdown Readout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-[#1E3A33]">
            <div className="space-y-1">
              <div className="text-xs font-medium text-neutral-500 dark:text-[#94A3B8]">
                {isExpired
                  ? 'Ephemeral session closed to prevent standing credential exposure.'
                  : isWarning
                    ? 'Renew your ephemeral Firebase Bearer token now to avoid automatic sign-out.'
                    : 'Earliest active JIT credential expires in:'}
              </div>
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-3xl font-mono font-bold tabular-nums tracking-tight ${
                    isExpired
                      ? 'text-red-600 dark:text-red-400'
                      : isWarning
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-[#34D399]'
                  }`}
                >
                  {isExpired ? '00:00' : formatDurationMmSs(remainingSeconds)}
                </span>
                <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-[#94A3B8]">
                  {activeExpiresAtMs ? `Expires ${formatClock(activeExpiresAtMs)}` : 'No active token'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              {isExpired ? (
                <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-300">
                  <ShieldAlert className="w-4 h-4" />
                  Terminated
                </span>
              ) : isWarning ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  Pre-Termination Warning
                </span>
              ) : isAuthenticated ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-[#34D399]">
                  <CheckCircle2 className="w-4 h-4" />
                  Nominal
                </span>
              ) : (
                <span className="text-neutral-500 dark:text-[#94A3B8]">Unauthenticated</span>
              )}
            </div>
          </div>

          {/* Ephemeral JIT Ceiling Selector */}
          {isAuthenticated && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-neutral-700 dark:text-[#A7F3D0]">
                  JIT Session Lifetime Ceiling
                </span>
                <span className="text-xs text-neutral-500 dark:text-[#94A3B8]">
                  Modal auto-triggers at 60s remaining
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-100 dark:bg-[#0B1311] rounded-lg border border-neutral-200 dark:border-[#1E3A33]">
                {jitWindows.map((w) => {
                  const active = strictWindowSeconds === w.seconds;
                  return (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => setStrictWindowSeconds(w.seconds)}
                      className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                        active
                          ? 'bg-white dark:bg-[#142320] text-neutral-900 dark:text-[#34D399] shadow-xs font-semibold'
                          : 'text-neutral-600 dark:text-[#94A3B8] hover:text-neutral-900 dark:hover:text-[#F0FDF4]'
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active JIT Credentials Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-[#A7F3D0]">
              Tracked JIT Credentials
            </h3>

            {credentials.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500 dark:text-[#94A3B8] border border-dashed border-neutral-200 dark:border-[#1E3A33] rounded-lg">
                No active ephemeral credentials. Sign in with Google to initialize JIT session tracking.
              </div>
            ) : (
              <div className="border border-neutral-200 dark:border-[#1E3A33] rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-[#0B1311] border-b border-neutral-200 dark:border-[#1E3A33] text-neutral-500 dark:text-[#94A3B8]">
                      <th className="py-2.5 px-3 font-medium">Credential</th>
                      <th className="py-2.5 px-3 font-medium">Issued</th>
                      <th className="py-2.5 px-3 font-medium">Expires</th>
                      <th className="py-2.5 px-3 font-medium text-right">Remaining</th>
                      <th className="py-2.5 px-3 font-medium text-right">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-[#1E3A33]">
                    {credentials.map((cred) => (
                      <tr
                        key={cred.id}
                        className="h-10 hover:bg-neutral-50 dark:hover:bg-[#142320]/60 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <div className="font-medium text-neutral-900 dark:text-[#F0FDF4] flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>{cred.label}</span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-[#94A3B8] pl-5">
                            {cred.provider}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-neutral-600 dark:text-[#94A3B8]">
                          {formatClock(cred.issuedAtMs)}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-neutral-600 dark:text-[#94A3B8]">
                          {formatClock(cred.expiresAtMs)}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right font-semibold text-neutral-900 dark:text-[#F0FDF4]">
                          {formatDurationMmSs(cred.remainingSeconds)}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {cred.status === 'expired' ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">Expired</span>
                          ) : cred.status === 'warning' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Expiring</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-[#34D399] font-medium">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Log */}
          {eventsLog.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-700 dark:text-[#A7F3D0]">
                Recent Session TTL Events
              </h3>
              <div className="border-t border-neutral-200 dark:border-[#1E3A33] divide-y divide-neutral-100 dark:divide-[#1E3A33]/70 max-h-32 overflow-y-auto text-[11px]">
                {eventsLog.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="py-2 flex items-start justify-between gap-3">
                    <span
                      className={
                        evt.level === 'critical'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : evt.level === 'warning'
                            ? 'text-amber-700 dark:text-amber-300 font-medium'
                            : 'text-neutral-700 dark:text-[#94A3B8]'
                      }
                    >
                      {evt.message}
                    </span>
                    <span className="font-mono tabular-nums text-neutral-400 shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-[#1E3A33] bg-neutral-50 dark:bg-[#0B1311] flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={dismissAlertModal}
            className="py-2 px-4 rounded-lg border border-neutral-300 dark:border-[#1E3A33] bg-white dark:bg-[#142320] hover:bg-neutral-100 dark:hover:bg-[#1E3A33] text-neutral-700 dark:text-[#94A3B8] text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
          >
            Dismiss
          </button>

          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => void terminateSession()}
                className="py-2 px-4 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Terminate Session</span>
              </button>
              <button
                type="button"
                onClick={() => void renewSession()}
                disabled={isRenewing}
                className="py-2 px-4 rounded-lg bg-[#064E3B] dark:bg-[#10B981] hover:bg-[#043E2E] dark:hover:bg-[#059669] text-white dark:text-[#0B1311] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRenewing ? 'animate-spin' : ''}`} />
                <span>{isRenewing ? 'Renewing Token...' : 'Renew JIT Credentials'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleReauthenticate()}
              className="py-2 px-4 rounded-lg bg-[#064E3B] dark:bg-[#10B981] hover:bg-[#043E2E] dark:hover:bg-[#059669] text-white dark:text-[#0B1311] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const SessionTtlMonitorHost: React.FC = () => {
  return <SessionTtlAlertModal />;
};
