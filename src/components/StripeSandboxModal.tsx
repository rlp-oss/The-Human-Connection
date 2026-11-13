import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Key,
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Webhook,
  Radio,
  Zap,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  computeCovenantSplit,
  createSignedOmegaCheckout,
  DEFAULT_CORRIDOR,
  DEFAULT_RAIL,
  FLEET_APPS_REGISTRY,
  type FleetAppId,
  SDK_VERSION,
} from '../sdk/cleanroomSdk';

interface StripeSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StripeSandboxModal: React.FC<StripeSandboxModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'keys'>('webhooks');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<FleetAppId>('tome-crafter');
  const [planName, setPlanName] = useState<string>('Pro Sovereign');
  const [amountUsd, setAmountUsd] = useState<number>(49);
  const [email, setEmail] = useState<string>('creator@human-network.org');
  const [signedCheckout, setSignedCheckout] = useState<{ url: string; sessionId: string } | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/omega/webhook`);
    }
  }, []);

  if (!isOpen) return null;

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleSignCheckout = async () => {
    setSigningLoading(true);
    setSignError(null);
    try {
      const appEntry = FLEET_APPS_REGISTRY[selectedApp];
      const res = await createSignedOmegaCheckout({
        app: selectedApp,
        plan: planName,
        target: appEntry.name,
        amountCents: Math.max(100, Math.round(amountUsd * 100)),
        email,
        corridor: DEFAULT_CORRIDOR,
      });
      setSignedCheckout({ url: res.url, sessionId: res.sessionId });
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.65 },
        colors: ['#3D6E50', '#D67D5C', '#5A5A40'],
      });
    } catch (err: any) {
      setSignError(err.message || 'Failed to generate signed /pay URL');
    } finally {
      setSigningLoading(false);
    }
  };

  const split = computeCovenantSplit(amountUsd);

  const webhookCodeSnippet = `// server.ts - Omega Protocol ${SDK_VERSION} Webhook Receiver
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { computeCovenantSplitCents } from './src/sdk/cleanroomSdk.ts';

app.post('/api/omega/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
  const sigHeader = String(req.headers['x-omega-signature'] || '');
  const secret = process.env.OMEGA_GATEWAY_SECRET || '';
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (!secret || sigHeader.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid X-Omega-Signature' });
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.type === 'omega.payment.completed') {
    const split = computeCovenantSplitCents(event.data?.amount_cents || 0);
    console.log('[50% COVENANT]', split);
  }
  return res.status(200).json({ received: true });
});`;

  const checkoutSignSnippet = `// server.ts - Server-side Sorted Query HMAC-SHA256 Signing
import crypto from 'node:crypto';

const params = new URLSearchParams({
  amount_cents: '4900',
  app: '${selectedApp}',
  app_code: '${FLEET_APPS_REGISTRY[selectedApp].code}',
  cancel_url: cancelUrl,
  corridor: '${DEFAULT_CORRIDOR}',
  email: '${email}',
  plan: '${planName}',
  rail: '${DEFAULT_RAIL}',
  return_url: returnUrl,
  session_id: sessionId,
  target: '${FLEET_APPS_REGISTRY[selectedApp].name}',
  user_id: userId,
});
params.sort();
const sig = crypto.createHmac('sha256', process.env.OMEGA_GATEWAY_SECRET!).update(params.toString()).digest('hex');
params.set('sig', sig);
const checkoutUrl = \`\${process.env.VITE_OMEGA_APP_URL}/pay?\${params.toString()}\`;`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2926]/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E5E0D8] bg-[#FFFFFF] p-6 shadow-2xl space-y-5 animate-scale-up my-8 text-[#2D2926]">
        <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] text-[#5A5A40]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D2926]">Omega Direct-Rail (/pay) &amp; Signed Webhook</h3>
              <p className="text-xs text-[#6A655C] font-mono">
                Protocol v{SDK_VERSION} • Rail: {DEFAULT_RAIL} • {DEFAULT_CORRIDOR}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8C857B] hover:text-[#2D2926] text-sm cursor-pointer">
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#E5E0D8] gap-4">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              activeTab === 'webhooks'
                ? 'border-[#D67D5C] text-[#D67D5C]'
                : 'border-transparent text-[#6A655C] hover:text-[#2D2926]'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>/pay Checkout &amp; Webhook</span>
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              activeTab === 'keys'
                ? 'border-[#D67D5C] text-[#D67D5C]'
                : 'border-transparent text-[#6A655C] hover:text-[#2D2926]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Environment &amp; HMAC Signing</span>
          </button>
        </div>

        {activeTab === 'webhooks' ? (
          <div className="space-y-4 text-xs text-[#2D2926]">
            {/* Live Webhook URL Box */}
            <div className="rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[#5A5A40] font-bold uppercase flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Signed Webhook Receiver Endpoint
                </span>
                <span className="text-[10px] bg-[#E8F5E9] text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-200">
                  X-Omega-Signature: sha256=&lt;hmac&gt;
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl || 'https://your-domain.com/api/omega/webhook'}
                  className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-lg px-3 py-2 text-xs font-mono text-[#2D2926] select-all focus:outline-none"
                />
                <button
                  onClick={() => copySnippet(webhookUrl, 'webhook-url')}
                  className="px-3 py-2 rounded-lg bg-[#D67D5C] hover:bg-[#C4704F] text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  {copiedKey === 'webhook-url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'webhook-url' ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#6A655C]">
                Verifies <code className="font-mono font-bold text-[#2D2926]">omega.payment.completed</code> events using timing-safe HMAC-SHA256 against <code className="font-mono text-[#5A5A40]">OMEGA_GATEWAY_SECRET</code>.
              </p>
            </div>

            {/* Interactive Signed /pay URL Generator */}
            <div className="rounded-xl border border-[#E5E0D8] bg-[#FFFFFF] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#2D2926] flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#D67D5C]" />
                  <span>Generate Signed Omega Direct-Rail /pay Link</span>
                </h4>
                <span className="text-[10px] font-mono text-[#5A5A40]">50% People&apos;s Covenant</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6A655C] mb-1">Fleet App</label>
                  <select
                    value={selectedApp}
                    onChange={(e) => setSelectedApp(e.target.value as FleetAppId)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DCD5CA] text-xs font-mono"
                  >
                    {Object.values(FLEET_APPS_REGISTRY).map((app) => (
                      <option key={app.appId} value={app.appId}>
                        {app.name} ({app.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6A655C] mb-1">Plan</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DCD5CA] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#6A655C] mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DCD5CA] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6A655C] mb-1">Subscriber Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DCD5CA] text-xs font-mono"
                />
              </div>

              {/* Live 50% Covenant Split Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] font-mono text-[10px]">
                <div>
                  <span className="text-[#8C857B] block">Ops &amp; Infra (50%)</span>
                  <strong className="text-[#2D2926]">${split.opsInfraUsd.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Pool A Creators (35%)</span>
                  <strong className="text-[#3D6E50]">${split.poolACreatorsUsd.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Pool B Stewards (7.5%)</span>
                  <strong className="text-[#5A5A40]">${split.poolBStewardsUsd.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Pool C $FOOD/$MED (7.5%)</span>
                  <strong className="text-[#D67D5C]">${split.poolCHumanitarianUsd.toFixed(2)}</strong>
                </div>
              </div>

              {signError && (
                <div className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#F1C4BD] text-[#8C2E24] font-mono text-[11px]">
                  {signError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignCheckout}
                  disabled={signingLoading}
                  className="px-4 py-2 rounded-lg bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${signingLoading ? 'animate-spin' : ''}`} />
                  <span>{signingLoading ? 'Signing...' : 'Sign Checkout URL (Server HMAC)'}</span>
                </button>
                {signedCheckout && (
                  <a
                    href={signedCheckout.url}
                    target="_top"
                    className="px-4 py-2 rounded-lg bg-[#D67D5C] hover:bg-[#C4704F] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Launch /pay Checkout</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {signedCheckout && (
                <div className="p-2.5 rounded-lg bg-[#F5F1EB] border border-[#DCD5CA] font-mono text-[10px] break-all select-all">
                  {signedCheckout.url}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-[#2D2926]">
            {/* Environment Variables Table */}
            <div className="rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] p-4 space-y-3">
              <span className="font-mono text-[#5A5A40] font-bold uppercase block">
                Omega Cleanroom Environment Variables (.env)
              </span>
              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between p-2.5 rounded bg-[#FFFFFF] border border-[#E5E0D8]">
                  <div>
                    <span className="text-[#2D2926] font-bold">OMEGA_GATEWAY_SECRET</span>
                    <span className="block text-[10px] text-[#8C857B]">HMAC-SHA256 signing &amp; X-Omega-Signature verification secret</span>
                  </div>
                  <span className="text-[10px] bg-[#F0F2EB] text-[#5A5A40] px-2 py-0.5 rounded border border-[#C9D1BE]">
                    Server-Only
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-[#FFFFFF] border border-[#E5E0D8]">
                  <div>
                    <span className="text-[#2D2926] font-bold">OMEGA_APP_URL / VITE_OMEGA_APP_URL</span>
                    <span className="block text-[10px] text-[#8C857B]">Sovereign Hub &amp; /pay Direct-Rail gateway base URL</span>
                  </div>
                  <span className="text-[10px] bg-[#F0F2EB] text-[#5A5A40] px-2 py-0.5 rounded border border-[#C9D1BE]">
                    Hub Parity
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[#5A5A40]">
                <span className="flex items-center gap-1.5 font-semibold">
                  <FileCode className="w-4 h-4 text-[#5A5A40]" />
                  Server-Side Checkout Query Signing
                </span>
                <button
                  onClick={() => copySnippet(checkoutSignSnippet, 'sign-code')}
                  className="text-xs text-[#5A5A40] hover:text-[#2D2926] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'sign-code' ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sign-code' ? 'Copied' : 'Copy Snippet'}</span>
                </button>
              </div>
              <pre className="rounded-xl bg-[#2D2926] p-3 text-[11px] font-mono text-[#F9F7F2] overflow-x-auto border border-[#423D38] max-h-40">
                {checkoutSignSnippet}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[#5A5A40]">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
                  Express Webhook Receiver (/api/omega/webhook)
                </span>
                <button
                  onClick={() => copySnippet(webhookCodeSnippet, 'webhook-code')}
                  className="text-xs text-[#5A5A40] hover:text-[#2D2926] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'webhook-code' ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'webhook-code' ? 'Copied' : 'Copy Snippet'}</span>
                </button>
              </div>
              <pre className="rounded-xl bg-[#2D2926] p-3 text-[11px] font-mono text-[#F9F7F2] overflow-x-auto border border-[#423D38] max-h-40">
                {webhookCodeSnippet}
              </pre>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-[#E5E0D8]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#D67D5C] hover:bg-[#C4704F] text-white shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
