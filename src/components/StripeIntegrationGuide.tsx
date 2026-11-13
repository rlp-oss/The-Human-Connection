import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Code2,
  Key,
  RefreshCw,
  Layers,
  Globe,
  Send,
} from 'lucide-react';
import axios from 'axios';
import {
  computeCovenantSplit,
  createSignedOmegaCheckout,
  DEFAULT_CORRIDOR,
  DEFAULT_RAIL,
  FLEET_APPS_REGISTRY,
  getOmegaAppUrl,
  SDK_VERSION,
} from '../sdk/cleanroomSdk';

interface GatewayInfoState {
  webhookEndpointUrl: string;
  omegaAppUrl: string;
  hasGatewaySecret: boolean;
  supportedEvents: string[];
  sdkVersion: string;
  rail: string;
  corridor: string;
}

export const StripeIntegrationGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'cleanroom-sdk' | 'node' | 'python' | 'curl'>('cleanroom-sdk');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [testAppSource, setTestAppSource] = useState<string>('tome-crafter');
  const [testAmount, setTestAmount] = useState<number>(49.0);
  const [testEmail, setTestEmail] = useState<string>('creator.test@ethical-ai.org');
  const [testPlan, setTestPlan] = useState<string>('Pro Sovereign');
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
    sessionId?: string;
    params?: Record<string, string>;
    timestamp: string;
  } | null>(null);

  const omegaBaseUrl = getOmegaAppUrl();

  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfoState>({
    webhookEndpointUrl: `${window.location.origin}/api/omega/webhook`,
    omegaAppUrl: omegaBaseUrl,
    hasGatewaySecret: false,
    supportedEvents: ['omega.payment.completed'],
    sdkVersion: SDK_VERSION,
    rail: DEFAULT_RAIL,
    corridor: DEFAULT_CORRIDOR,
  });

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await axios.get('/api/omega/gateway-info');
        if (res.data) {
          setGatewayInfo((prev) => ({
            ...prev,
            ...res.data,
            webhookEndpointUrl: res.data.webhookEndpointUrl || `${window.location.origin}/api/omega/webhook`,
          }));
        }
      } catch {
        setGatewayInfo((prev) => ({
          ...prev,
          webhookEndpointUrl: `${window.location.origin}/api/omega/webhook`,
        }));
      }
    };
    fetchInfo();
  }, []);

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleGenerateSignedCheckout = async () => {
    setIsSigning(true);
    setCheckoutResult(null);

    try {
      const appEntry = FLEET_APPS_REGISTRY[testAppSource as keyof typeof FLEET_APPS_REGISTRY] || FLEET_APPS_REGISTRY['tome-crafter'];
      const signed = await createSignedOmegaCheckout({
        app: appEntry.appId,
        plan: testPlan,
        target: appEntry.name,
        amountCents: Math.max(100, Math.round(testAmount * 100)),
        email: testEmail,
        corridor: DEFAULT_CORRIDOR,
      });

      setCheckoutResult({
        success: true,
        message: `Server-signed Omega Direct-Rail /pay checkout URL generated (Session: ${signed.sessionId}).`,
        url: signed.url,
        sessionId: signed.sessionId,
        params: signed.params,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setCheckoutResult({
        success: false,
        message: err.message || 'Failed to generate signed /pay checkout URL',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSigning(false);
    }
  };

  const currentWebhookUrl = gatewayInfo.webhookEndpointUrl || `${window.location.origin}/api/omega/webhook`;
  const split = computeCovenantSplit(testAmount);

  const cleanroomSdkSnippet = `import {
  computeCovenantSplit,
  createSignedOmegaCheckout,
  syncDeliverableToOmega,
  DEFAULT_CORRIDOR
} from './src/sdk/cleanroomSdk';

// 1. Compute exact 50% People's Covenant split (Pool A 35%, Pool B 7.5%, Pool C 7.5%)
const split = computeCovenantSplit(${testAmount.toFixed(2)});

// 2. Request server-signed Omega Direct-Rail /pay checkout URL (zero client secrets)
const checkout = await createSignedOmegaCheckout({
  app: '${testAppSource}',
  plan: '${testPlan}',
  amountCents: ${Math.max(100, Math.round(testAmount * 100))},
  email: '${testEmail}',
  corridor: DEFAULT_CORRIDOR,
});`;

  const nodeCodeSnippet = `// server.ts - Node 22 Native Type-Stripping Compatible
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { computeCovenantSplitCents } from './src/sdk/cleanroomSdk.ts';

app.post('/api/omega/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
  const sig = String(req.headers['x-omega-signature'] || '');
  const secret = process.env.OMEGA_GATEWAY_SECRET || '';
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (!secret || sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid X-Omega-Signature' });
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.type === 'omega.payment.completed') {
    const split = computeCovenantSplitCents(event.data?.amount_cents || 0);
    console.log('[50% PEOPLE COVENANT]', split);
  }
  return res.status(200).json({ received: true });
});`;

  const pythonFlaskSnippet = `# gateway.py - Omega Direct-Rail Signed Webhook Receiver
from flask import Flask, request, jsonify
import hmac
import hashlib
import os

app = Flask(__name__)
OMEGA_GATEWAY_SECRET = os.environ.get("OMEGA_GATEWAY_SECRET", "")

@app.route("/api/omega/webhook", methods=["POST"])
def omega_webhook():
    raw_body = request.data
    sig_header = request.headers.get("X-Omega-Signature", "")
    expected_sig = "sha256=" + hmac.new(
        OMEGA_GATEWAY_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    if not OMEGA_GATEWAY_SECRET or not hmac.compare_digest(sig_header, expected_sig):
        return jsonify({"error": "Invalid X-Omega-Signature"}), 401

    event = request.get_json(silent=True) or {}
    if event.get("type") == "omega.payment.completed":
        cents = int(event.get("data", {}).get("amount_cents", 0))
        society_fund = cents - round(cents * 0.50)
        print(f"[OMEGA PAYMENT] 50% Covenant Fund: {society_fund} cents")

    return jsonify({"received": True}), 200`;

  const curlSnippet = `# 1. Verify fleet health endpoint (CORS *)
curl -i ${window.location.origin}/api/fleet/${testAppSource}/health

# 2. Sign a /pay checkout URL server-side
curl -s -X POST ${window.location.origin}/api/omega/sign-checkout \\
  -H "Content-Type: application/json" \\
  -d '{"app":"${testAppSource}","plan":"${testPlan}","amount_cents":${Math.max(100, Math.round(testAmount * 100))},"email":"${testEmail}"}'`;

  return (
    <div id="omega-integration-guide-container" className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#EAE4DC] text-[#5A5A40] border border-[#DCD5CA]">
              <CreditCard className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Omega Direct-Rail /pay &amp; Signed Webhook ({gatewayInfo.sdkVersion})</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3D6E50] animate-pulse"></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2926]">
              Omega Direct-Rail (/pay) &amp; 50% Covenant Webhook Guide
            </h1>
            <p className="text-sm sm:text-base text-[#6A655C] max-w-2xl leading-relaxed">
              Route fleet upgrades and licensing directly to <strong className="text-[#2D2926]">{gatewayInfo.omegaAppUrl}/pay</strong> over the <code className="font-mono text-[#5A5A40]">{gatewayInfo.rail}</code> rail with server-signed HMAC-SHA256 query parameters and timing-safe <code className="font-mono text-[#5A5A40]">X-Omega-Signature</code> webhook verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`${gatewayInfo.omegaAppUrl}/pay`}
              target="_top"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#2D2926] hover:bg-[#403B37] text-[#FAF8F5] shadow-xs transition-colors cursor-pointer"
            >
              <span>Open Omega Hub /pay</span>
              <ExternalLink className="w-4 h-4 text-[#D67D5C]" />
            </a>
          </div>
        </div>
      </div>

      {/* Primary Card: Signed Webhook Endpoint URL */}
      <div className="rounded-2xl border-2 border-[#D67D5C]/40 bg-[#FFFFFF] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#D67D5C]">
              <Globe className="w-4 h-4" />
              <span>Production Signed Webhook Receiver URL</span>
            </div>
            <span className="text-xs font-mono text-[#3D6E50] bg-[#EBF3EE] px-2.5 py-1 rounded-full border border-[#C5DEC0] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3D6E50]"></span>
              {gatewayInfo.hasGatewaySecret ? 'OMEGA_GATEWAY_SECRET Configured' : 'Using Runtime Gateway Secret'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 flex items-center bg-[#FAF8F5] border border-[#DCD5CA] rounded-xl px-4 py-3.5 font-mono text-sm sm:text-base text-[#2D2926] shadow-inner select-all overflow-x-auto">
              <span className="text-[#6A655C] select-none mr-1.5 font-sans text-xs">POST:</span>
              <strong className="text-[#2D2926] font-semibold">{currentWebhookUrl}</strong>
            </div>

            <button
              id="copy-webhook-url-btn"
              onClick={() => copyToClipboard(currentWebhookUrl, 'main-url')}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer shadow-xs ${
                copiedSection === 'main-url'
                  ? 'bg-[#3D6E50] text-[#FFFFFF]'
                  : 'bg-[#D67D5C] hover:bg-[#C26D4D] text-[#FFFFFF]'
              }`}
            >
              {copiedSection === 'main-url' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Webhook URL</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-[#6A655C] font-mono flex items-center gap-2 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#3D6E50] shrink-0" />
            <span>
              Authenticates <code className="bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5E0D8] text-[#5A5A40]">X-Omega-Signature: sha256=&lt;hmac&gt;</code> for <code className="font-bold">omega.payment.completed</code> events.
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          {/* 4-Step Omega Protocol Setup */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-[#FFFFFF] p-6 shadow-xs">
            <h2 className="text-lg font-serif font-bold text-[#2D2926] mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#5A5A40]" />
              <span>Omega Direct-Rail (/pay) Integration Architecture</span>
            </h2>

            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Configure Server Environment Variables',
                  desc: 'Set OMEGA_APP_URL, VITE_OMEGA_APP_URL, and server-only OMEGA_GATEWAY_SECRET. Never expose signing secrets in client bundles.',
                },
                {
                  step: 2,
                  title: 'Sign Sorted /pay Query Parameters Server-Side',
                  desc: 'POST /api/omega/sign-checkout sorts app, app_code, amount_cents, corridor, email, plan, rail, return_url, cancel_url, session_id, target, user_id and appends sig=HMAC-SHA256.',
                },
                {
                  step: 3,
                  title: 'Verify X-Omega-Signature Webhook Events',
                  desc: 'POST /api/omega/webhook validates X-Omega-Signature: sha256=<hmac> with crypto.timingSafeEqual on raw bytes before unlocking tier entitlements.',
                },
                {
                  step: 4,
                  title: 'Handle Return URL Activation & 50% Covenant Split',
                  desc: 'On redirect back with ?omega_status=success&tier=...&session_id=..., persist verified tier status and split gross inflows 50% Ops / 50% Society Fund (Pool A 35%, Pool B 7.5%, Pool C 7.5%).',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  onClick={() => setActiveStep(item.step)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeStep === item.step
                      ? 'border-[#5A5A40] bg-[#FAF8F5] shadow-xs'
                      : 'border-[#E5E0D8] hover:border-[#DCD5CA] bg-[#FFFFFF]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                        activeStep === item.step ? 'bg-[#5A5A40] text-[#FFFFFF]' : 'bg-[#EAE4DC] text-[#5A5A40]'
                      }`}
                    >
                      {item.step}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-[#2D2926]">{item.title}</h3>
                      <p className="text-xs text-[#6A655C] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Query Parameter & Covenant Spec Table */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAF8F5] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#5A5A40]" />
              <h3 className="text-base font-serif font-bold text-[#2D2926]">
                Sorted /pay Query Contract &amp; 50% Covenant Measurements
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-[#FFFFFF]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F2ECE4] text-[#5A5A40] border-b border-[#E5E0D8]">
                  <tr>
                    <th className="p-2.5 font-bold">Parameter / Pool</th>
                    <th className="p-2.5 font-bold">Value</th>
                    <th className="p-2.5 font-bold">Protocol Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8] text-[#2D2926]">
                  <tr>
                    <td className="p-2.5 text-[#D67D5C] font-bold">rail / corridor</td>
                    <td className="p-2.5">canada-rtr / Global Pool C ($FOOD / $MED)</td>
                    <td className="p-2.5 text-[#6A655C] font-sans">Direct-rail sovereign settlement corridor</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#D67D5C] font-bold">Pool A (Creators)</td>
                    <td className="p-2.5">70% of Society Fund (35% gross)</td>
                    <td className="p-2.5 text-[#6A655C] font-sans">Direct verified human creator royalties</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#D67D5C] font-bold">Pool B (Stewards)</td>
                    <td className="p-2.5">15% of Society Fund (7.5% gross)</td>
                    <td className="p-2.5 text-[#6A655C] font-sans">Cleanroom OSS maintainers &amp; commons</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#D67D5C] font-bold">Pool C ($FOOD / $MED)</td>
                    <td className="p-2.5">15% of Society Fund (7.5% gross)</td>
                    <td className="p-2.5 text-[#6A655C] font-sans">Humanitarian relief corridor allocation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Signed Checkout Builder & Code Samples */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border-2 border-[#5A5A40]/30 bg-[#FFFFFF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#5A5A40]" />
                <h3 className="text-base font-serif font-bold text-[#2D2926]">
                  Signed /pay Checkout Generator
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#5A5A40] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E5E0D8]">
                HMAC-SHA256
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-mono text-[#5A5A40] mb-1">Fleet Application</label>
                <select
                  value={testAppSource}
                  onChange={(e) => setTestAppSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CA] bg-[#FAF8F5] text-xs font-mono text-[#2D2926] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  {Object.values(FLEET_APPS_REGISTRY).map((app) => (
                    <option key={app.appId} value={app.appId}>
                      {app.name} ({app.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5A5A40] mb-1">Plan Tier</label>
                  <input
                    type="text"
                    value={testPlan}
                    onChange={(e) => setTestPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#DCD5CA] bg-[#FAF8F5] text-xs font-mono text-[#2D2926]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5A5A40] mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#DCD5CA] bg-[#FAF8F5] text-xs font-mono text-[#2D2926]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5A5A40] mb-1">Customer Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCD5CA] bg-[#FAF8F5] text-xs font-mono text-[#2D2926]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6A655C]">Ops &amp; Infra (50%):</span>
                  <strong>${split.opsInfraUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-[#3D6E50]">
                  <span>Pool A Creators (35%):</span>
                  <strong>${split.poolACreatorsUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-[#5A5A40]">
                  <span>Pool B Stewards (7.5%):</span>
                  <strong>${split.poolBStewardsUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-[#D67D5C]">
                  <span>Pool C $FOOD/$MED (7.5%):</span>
                  <strong>${split.poolCHumanitarianUsd.toFixed(2)}</strong>
                </div>
              </div>

              <button
                id="generate-signed-checkout-btn"
                onClick={handleGenerateSignedCheckout}
                disabled={isSigning}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-xs bg-[#2D2926] hover:bg-[#403B37] text-[#FAF8F5] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D67D5C]" />
                    <span>Signing Sorted Query Payload...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#D67D5C]" />
                    <span>Generate Signed /pay Checkout URL</span>
                  </>
                )}
              </button>

              {checkoutResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    checkoutResult.success
                      ? 'bg-[#EBF3EE] border-[#C5DEC0] text-[#2D2926]'
                      : 'bg-[#FDF2F0] border-[#F1C4BD] text-[#8C2E24]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {checkoutResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-[#3D6E50]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#8C2E24]" />
                      )}
                      <span>{checkoutResult.success ? 'HMAC Signed URL Ready' : 'Signing Error'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#6A655C]">{checkoutResult.timestamp}</span>
                  </div>
                  <p className="text-[11px] font-mono">{checkoutResult.message}</p>
                  {checkoutResult.url && (
                    <div className="space-y-2 pt-1">
                      <div className="p-2 rounded bg-[#FFFFFF] border border-[#C5DEC0] font-mono text-[10px] break-all select-all max-h-24 overflow-y-auto">
                        {checkoutResult.url}
                      </div>
                      <a
                        href={checkoutResult.url}
                        target="_top"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D67D5C] hover:bg-[#C4704F] text-white text-xs font-semibold"
                      >
                        <span>Proceed to Omega /pay</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Implementation Snippets */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-[#2D2926] text-[#FAF8F5] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#D67D5C]" />
                <h3 className="text-sm font-serif font-bold text-[#FAF8F5]">Cleanroom SDK &amp; Webhook Samples</h3>
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-[#403B37] p-0.5 rounded-lg text-[10px] font-mono">
                {(['cleanroom-sdk', 'node', 'python', 'curl'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      selectedLanguage === lang
                        ? 'bg-[#D67D5C] text-[#FFFFFF] font-bold'
                        : 'text-[#C5BEB3] hover:text-[#FAF8F5]'
                    }`}
                  >
                    {lang === 'cleanroom-sdk' ? 'Cleanroom SDK' : lang === 'node' ? 'Node 22' : lang === 'python' ? 'Flask' : 'cURL'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-[#1A1816] border border-[#403B37] text-[11px] font-mono text-[#DCD5CA] overflow-x-auto max-h-72 leading-relaxed">
                <code>
                  {selectedLanguage === 'cleanroom-sdk' && cleanroomSdkSnippet}
                  {selectedLanguage === 'node' && nodeCodeSnippet}
                  {selectedLanguage === 'python' && pythonFlaskSnippet}
                  {selectedLanguage === 'curl' && curlSnippet}
                </code>
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(
                    selectedLanguage === 'cleanroom-sdk'
                      ? cleanroomSdkSnippet
                      : selectedLanguage === 'node'
                      ? nodeCodeSnippet
                      : selectedLanguage === 'python'
                      ? pythonFlaskSnippet
                      : curlSnippet,
                    'snippet'
                  )
                }
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-[#2D2926]/80 hover:bg-[#403B37] text-[#FAF8F5] border border-[#5A5A40] text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy code"
              >
                {copiedSection === 'snippet' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3D6E50]" />
                    <span className="text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
