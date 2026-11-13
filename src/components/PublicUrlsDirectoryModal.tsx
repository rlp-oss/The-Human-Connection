import React, { useState, useEffect } from 'react';
import {
  Globe2,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Compass,
  ShieldCheck,
  Code2,
  Users,
  Landmark,
  Coins,
  Cpu,
  Store,
  CreditCard,
  Lock,
  Sparkles,
  BookOpen,
  Radio,
  Plus,
  Pencil
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { useTheme } from '../context/ThemeContext';
import {
  EcosystemAppEntry,
  ECOSYSTEM_UPDATED_EVENT,
  loadCachedEcosystemApps,
  fetchEcosystemApps,
  upsertEcosystemApp
} from '../services/ecosystemAppsService';

interface PublicUrlsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

interface NavDirectoryItem {
  id: ActiveTab;
  title: string;
  category: 'public' | 'creators' | 'developers' | 'admin';
  audience: string;
  urlPath: string;
  description: string;
  badge: string;
  badgeColor?: string;
  icon: any;
}

const DIRECTORY_ITEMS: NavDirectoryItem[] = [
  // 1. Public & Civic Commons
  {
    id: 'mission-home',
    title: 'The Mission (Public Sanctuary)',
    category: 'public',
    audience: 'Everyday Citizens & The World',
    urlPath: '/mission or ?tab=mission-home',
    description: 'The educational sanctuary breaking down how we end needless hate, pain, violence, greed & human suffering with the 50% covenant.',
    badge: 'Public Portal',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: Heart
  },
  {
    id: 'media-hub',
    title: 'App & Broadcast Hub (Podcast Fleet)',
    category: 'public',
    audience: 'Creators, Builders, Listeners & Community',
    urlPath: '/media or ?tab=media-hub',
    description: 'The Sovereign Human Renaissance Soundboard with interactive audio player, podcast series, app fleet registry, and open SDK guides.',
    badge: 'Podcast & Apps',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Radio
  },
  {
    id: 'roadmap-site',
    title: 'Human Initiative Roadmap (Reference Site)',
    category: 'public',
    audience: 'Researchers, Economists, Public',
    urlPath: '/roadmap or ?tab=roadmap-site',
    description: 'The 7-phase civilizational master plan, macroeconomic post-scarcity milestones, and downloadable markdown specification.',
    badge: 'Public Spec URL',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Compass
  },
  {
    id: 'merchants',
    title: 'Merchant POS & 1% QR Terminal',
    category: 'public',
    audience: 'Local Businesses & Shoppers',
    urlPath: '/merchants or ?tab=merchants',
    description: 'Physical and digital merchant checkout terminal empowering businesses to pledge 1% of transactions to human community flourishing.',
    badge: 'Merchant Terminal',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    icon: Store
  },
  // 2. Creators & Rightsholders
  {
    id: 'portal',
    title: 'Copyright Owner Portal & Transparency',
    category: 'creators',
    audience: 'Artists, Writers, Musicians, Photographers',
    urlPath: '/copyright-owner or ?tab=portal',
    description: 'Public verification portal for human creators to inspect C2PA provenance hashes, claim royalties, and verify zero-knowledge attribution.',
    badge: 'Creator Portal',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: ShieldCheck
  },
  {
    id: 'payouts',
    title: 'Creator Payouts & 50% Covenant Direct-Rail',
    category: 'creators',
    audience: 'Verified Creators & Rights Owners',
    urlPath: '/payouts or ?tab=payouts',
    description: 'Sovereign Omega Direct-Rail (/pay) payout engine splitting 50% People\'s Covenant funds across Pool A (35%), Pool B (7.5%), and Pool C $FOOD/$MED (7.5%).',
    badge: 'Omega Direct-Rail',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: Landmark
  },

  // 3. Developers & Engineers
  {
    id: 'compliance',
    title: 'Repository Compliance & Integrity Dashboard',
    category: 'developers',
    audience: 'Engineers, Security Auditors, Maintainers',
    urlPath: '/compliance or ?tab=compliance (#compliance)',
    description: 'Real-time 5-stage cryptographic auditing powered by BadgeComplianceAuditor. Detects flagged dependencies, quarantines toxic scrapers, and aligns 50% People’s Covenant splits.',
    badge: '5-Stage Auditor',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: ShieldCheck
  },
  {
    id: 'developer-embed',
    title: 'Developer Embed & Ecosystem SDKs',
    category: 'developers',
    audience: 'Engineers, Indie Hackers, SaaS Builders',
    urlPath: '/developers or ?tab=developer-embed',
    description: 'React, Python, and Web Component embed kits to add the 50% verified trust badge and automatic revenue split webhooks in minutes.',
    badge: 'SDK Hub',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Code2
  },
  {
    id: 'stripe-guide',
    title: 'Omega Direct-Rail /pay & Signed Webhook Guide',
    category: 'developers',
    audience: 'Backend Engineers & Payment Admins',
    urlPath: '/omega-guide or ?tab=stripe-guide',
    description: 'Implementation guide for server-signed Omega Direct-Rail /pay checkouts, X-Omega-Signature HMAC verification, and C2PA record syncing.',
    badge: 'Webhook & /pay',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: CreditCard
  },

  // 4. Admin, AI & Valuation
  {
    id: 'technical-ai' as ActiveTab,
    title: 'Technical AI Build Assessment Panel',
    category: 'admin',
    audience: 'CTO, Lead Architects, AI Engineers',
    urlPath: '/technical-ai or ?tab=technical-ai',
    description: 'AI-powered build diagnostics evaluating C2PA manifests, multi-tenant locks, rate limiting, and progressive solutions for full completion.',
    badge: 'AI Diagnostics',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Cpu
  },
  {
    id: 'crypto-valuation' as ActiveTab,
    title: 'Crypto, Whitepaper & Valuation Optimizer',
    category: 'admin',
    audience: 'Founders, CFO, Web3 Token Strategists',
    urlPath: '/crypto-valuation or ?tab=crypto-valuation',
    description: 'Tokenomics strategy for $HUMAN, $RESTITUTE, and $CREATOR, interactive valuation simulator, and downloadable institutional whitepaper.',
    badge: 'Valuation Suite',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: Coins
  },
  {
    id: 'crypto-wallet' as ActiveTab,
    title: 'Sovereign Token Wallet Suite',
    category: 'admin',
    audience: 'Token Holders, Creators, Validators & Citizens',
    urlPath: '/wallet or ?tab=crypto-wallet',
    description: 'Self-custody BIP-39 24-word fortress wallet with mandatory phrase verification, phone/email 2FA, zero-knowledge humanity proof (zk-KYC), and ERC-4337 gasless transfers.',
    badge: '24-Word Vault',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Lock
  },
  {
    id: 'testers',
    title: 'Beta Tester & Contributor Onboarding Console',
    category: 'admin',
    audience: 'Product Managers & Internal Admins',
    urlPath: '/testers or ?tab=testers',
    description: 'Manage contributors across the fleet apps ($FOOD, $MED, $CREW, Developer), launch signed Omega /pay checkouts, and reset sessions via Omega Hub.',
    badge: 'Internal Admin',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    icon: Users
  }
];

export const PublicUrlsDirectoryModal: React.FC<PublicUrlsDirectoryModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'independent' | 'public' | 'creators' | 'developers' | 'admin'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [independentApps, setIndependentApps] = useState<EcosystemAppEntry[]>(() => loadCachedEcosystemApps());
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newAppId, setNewAppId] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newVertical, setNewVertical] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchEcosystemApps().then((apps) => setIndependentApps(apps));
    const onUpdated = (e: Event) => {
      const custom = e as CustomEvent<EcosystemAppEntry[]>;
      if (Array.isArray(custom.detail)) {
        setIndependentApps(custom.detail);
      } else {
        setIndependentApps(loadCachedEcosystemApps());
      }
    };
    window.addEventListener(ECOSYSTEM_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(ECOSYSTEM_UPDATED_EVENT, onUpdated);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = filterCategory === 'independent'
    ? []
    : filterCategory === 'all'
    ? DIRECTORY_ITEMS
    : DIRECTORY_ITEMS.filter(item => item.category === filterCategory);

  const handleCopy = (path: string, id: string) => {
    const fullUrl = /^https?:\/\//i.test(path) ? path : `${window.location.origin}${path.split(' ')[0]}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleSaveAppUrl = async (app: EcosystemAppEntry) => {
    setIsSaving(true);
    try {
      const updated = await upsertEcosystemApp({
        ...app,
        appUrl: draftUrl.trim(),
      });
      setIndependentApps(updated);
      setEditingAppId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIndependentApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAppId.trim()) return;
    setIsSaving(true);
    try {
      const updated = await upsertEcosystemApp({
        name: newName.trim(),
        appId: newAppId.trim(),
        vertical: newVertical.trim() || 'Independent Deployed Application',
        appUrl: newUrl.trim(),
      });
      setIndependentApps(updated);
      setShowAddForm(false);
      setNewName('');
      setNewAppId('');
      setNewUrl('');
      setNewVertical('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#FFFFFF] dark:bg-[#101B18] border border-[#E5E0D8] dark:border-[#1E3A33] shadow-2xl overflow-hidden text-[#2D2926] dark:text-[#F3F1EC]">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E0D8] dark:border-[#1E3A33] bg-[#FAF8F5] dark:bg-[#0B1311] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#10B981]/20 text-[#059669] dark:text-[#34D399] border border-[#10B981]/30">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Public URLs & Independent Apps Directory</h2>
              <p className="text-xs text-[#6A655C] dark:text-[#94A3B8]">
                Manage live URLs for independent apps (ReForgeOS, Omega, Fleet) alongside internal H.U.M.A.N. consoles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-[#F2ECE4] dark:bg-[#142320] hover:bg-[#E5E0D8] text-xs font-mono font-bold cursor-pointer transition-colors shrink-0"
          >
            Close ✕
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-[#E5E0D8] dark:border-[#1E3A33] bg-[#FFFFFF] dark:bg-[#142320] flex flex-wrap gap-2 text-xs font-mono">
          {[
            { id: 'all', label: 'All Ecosystem URLs' },
            { id: 'independent', label: `Independent Apps (${independentApps.length})` },
            { id: 'public', label: 'Public & Civic Commons' },
            { id: 'creators', label: 'Creators & Rights Owners' },
            { id: 'developers', label: 'Developers & Webhooks' },
            { id: 'admin', label: 'Admin, AI & Valuation' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id as any)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterCategory === tab.id
                  ? 'bg-[#064E3B] text-white font-bold'
                  : 'bg-[#F2ECE4] dark:bg-[#0B1311] text-[#6A655C] dark:text-[#94A3B8] hover:bg-[#E5E0D8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {(filterCategory === 'all' || filterCategory === 'independent') && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">Independent Launched Applications</h3>
                  <p className="text-[11px] text-[#6A655C] dark:text-[#94A3B8]">
                    Add or update URLs for separately deployed apps (ReForgeOS, Omega App, Tome Crafter, RLM Pro, RL Easy Flow).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Close Form' : 'Add Independent App URL'}</span>
                </button>
              </div>

              {showAddForm && (
                <form
                  onSubmit={handleAddIndependentApp}
                  className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#0B1311] border border-[#10B981]/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
                >
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newAppId) {
                        setNewAppId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                      }
                    }}
                    placeholder="App Name (e.g. Omega App)"
                    className="px-3 py-2 rounded-lg border border-[#E5E0D8] dark:border-[#1E3A33] bg-white dark:bg-[#142320]"
                  />
                  <input
                    type="text"
                    required
                    value={newAppId}
                    onChange={(e) => setNewAppId(e.target.value)}
                    placeholder="App Slug (e.g. omega-app)"
                    className="px-3 py-2 rounded-lg border border-[#E5E0D8] dark:border-[#1E3A33] bg-white dark:bg-[#142320] font-mono"
                  />
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Live URL (https://...)"
                    className="px-3 py-2 rounded-lg border border-[#E5E0D8] dark:border-[#1E3A33] bg-white dark:bg-[#142320] font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newVertical}
                      onChange={(e) => setNewVertical(e.target.value)}
                      placeholder="Purpose / Vertical"
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E5E0D8] dark:border-[#1E3A33] bg-white dark:bg-[#142320]"
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-bold cursor-pointer whitespace-nowrap"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {independentApps.map((app) => {
                  const isEditing = editingAppId === app.id;
                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#0B1311] border border-[#E5E0D8] dark:border-[#1E3A33] flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs truncate">{app.name}</h4>
                          <span className="text-[10px] font-mono text-[#6A655C] dark:text-[#94A3B8]">
                            {app.appUrl ? 'Live URL Bound' : 'Pending URL'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6A655C] dark:text-[#94A3B8]">{app.vertical}</p>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={draftUrl}
                              onChange={(e) => setDraftUrl(e.target.value)}
                              placeholder="https://..."
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#10B981] bg-white dark:bg-[#142320] text-[11px] font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveAppUrl(app)}
                              disabled={isSaving}
                              className="px-2.5 py-1.5 rounded-lg bg-[#059669] text-white text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAppId(null)}
                              className="px-2 py-1.5 rounded-lg border border-[#E5E0D8] dark:border-[#1E3A33] text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-white dark:bg-[#142320] border border-[#E5E0D8] dark:border-[#1E3A33] flex items-center justify-between gap-2 text-[11px] font-mono">
                            <span className={`truncate ${app.appUrl ? 'text-[#059669] dark:text-[#34D399]' : 'text-[#8C857B]'}`}>
                              {app.appUrl || 'No URL bound yet'}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAppId(app.id);
                                  setDraftUrl(app.appUrl || '');
                                }}
                                className="flex items-center gap-1 text-[10px] text-[#6A655C] dark:text-[#94A3B8] hover:text-[#2D2926] dark:hover:text-white cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              {app.appUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(app.appUrl!, `ext_${app.id}`)}
                                  className="flex items-center gap-1 text-[10px] text-[#6A655C] dark:text-[#94A3B8] hover:text-[#2D2926] dark:hover:text-white cursor-pointer"
                                >
                                  {copiedUrl === `ext_${app.id}` ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedUrl === `ext_${app.id}` ? 'Copied' : 'Copy'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E5E0D8] dark:border-[#1E3A33] flex items-center justify-between text-[11px]">
                        <span className="text-[#8C857B] font-mono truncate">{app.appId}</span>
                        {app.appUrl ? (
                          <a
                            href={app.appUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B1311] font-bold font-mono text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <span>Launch App</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAppId(app.id);
                              setDraftUrl('');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#F2ECE4] dark:bg-[#142320] text-[#2D2926] dark:text-[#F3F1EC] font-bold font-mono text-[10px] cursor-pointer"
                          >
                            Set URL
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredItems.length > 0 && (
            <div className="space-y-3">
              {filterCategory === 'all' && (
                <h3 className="text-sm font-bold pt-2 border-t border-[#E5E0D8] dark:border-[#1E3A33]">
                  Internal H.U.M.A.N. Consoles & Portals
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#0B1311] border border-[#E5E0D8] dark:border-[#1E3A33] hover:border-[#10B981]/50 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-[#EBE5DC] dark:bg-[#1E3A33] text-[#064E3B] dark:text-[#34D399]">
                              <Icon className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-xs">{item.title}</h3>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#6A655C] dark:text-[#94A3B8] leading-relaxed">
                          {item.description}
                        </p>

                        <div className="p-2 rounded-xl bg-white dark:bg-[#142320] border border-[#E5E0D8] dark:border-[#1E3A33] flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#059669] dark:text-[#34D399] truncate mr-2">{item.urlPath}</span>
                          <button
                            onClick={() => handleCopy(item.urlPath, item.id)}
                            className="flex items-center gap-1 text-[10px] text-[#6A655C] dark:text-[#94A3B8] hover:text-[#2D2926] dark:hover:text-white cursor-pointer shrink-0"
                          >
                            {copiedUrl === item.id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUrl === item.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E5E0D8] dark:border-[#1E3A33] flex items-center justify-between text-[11px]">
                        <span className="text-[#8C857B] font-mono">Audience: {item.audience}</span>
                        <button
                          onClick={() => {
                            onNavigateTab(item.id);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#0B1311] font-bold font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Open View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
