import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertOctagon, 
  FileCode, 
  DollarSign, 
  Layers, 
  Lock, 
  Scale, 
  Search, 
  Filter, 
  ArrowRight, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Code, 
  Sparkles, 
  Cpu, 
  FileCheck, 
  Sliders, 
  Eye, 
  Info, 
  Trash2, 
  Wrench,
  ChevronRight,
  Zap,
  Activity,
  Award,
  ShieldAlert,
  Ban
} from 'lucide-react';
import { BadgeComplianceAuditor, AuditResult } from '../BadgeComplianceAuditor';
import { HUMAN_PROTOCOL_SPECIFICATION } from '../HumanProtocolSpecification';
import { signAndSyncDeliverable } from '../services/c2paService';
import confetti from 'canvas-confetti';

export interface RegisteredEcosystemApp {
  id: string;
  name: string;
  category: string;
  repositoryPath: string;
  version: string;
  packageDependencies: string[];
  stripeSplitConfig: {
    platformSplitPct: number; // Protocol requirement: 0.50
    poolASplitPct: number;    // Protocol requirement: 0.70
    poolBSplitPct: number;    // Protocol requirement: 0.15
    poolCSplitPct: number;    // Protocol requirement: 0.15
  };
  c2paMetadata: {
    version: string; // 'v2.1'
    signatureAlgo: string; // 'ECDSA-SHA256'
  };
  sybilConfig: {
    vouchScore: number; // >= 0.85
    geohashLen: number; // 5
  };
  liveTrafficCount: number;
  lastAudited?: string;
}

const INITIAL_APPS: RegisteredEcosystemApp[] = [
  {
    id: 'tome-crafter',
    name: 'Tome Crafter',
    category: 'Creative Writing & Sovereign Publishing',
    repositoryPath: '/apps/tome-crafter',
    version: 'v2.4.1',
    packageDependencies: ['react', 'react-dom', 'lucide-react', 'c2pa-node', 'epub-gen', 'tailwind-merge'],
    stripeSplitConfig: {
      platformSplitPct: 0.50,
      poolASplitPct: 0.70,
      poolBSplitPct: 0.15,
      poolCSplitPct: 0.15
    },
    c2paMetadata: {
      version: 'v2.1',
      signatureAlgo: 'ECDSA-SHA256'
    },
    sybilConfig: {
      vouchScore: 0.94,
      geohashLen: 5
    },
    liveTrafficCount: 4230
  },
  {
    id: 'rlm-pro-studio',
    name: 'RLM Pro Studio',
    category: 'Hybrid Audio Workstation & DAW Stems',
    repositoryPath: '/apps/rlm-pro-studio',
    version: 'v1.8.0',
    packageDependencies: ['react', 'tone', 'audio-context', 'c2pa-provenance', 'lucide-react'],
    stripeSplitConfig: {
      platformSplitPct: 0.50,
      poolASplitPct: 0.70,
      poolBSplitPct: 0.15,
      poolCSplitPct: 0.15
    },
    c2paMetadata: {
      version: 'v2.1',
      signatureAlgo: 'ECDSA-SHA256'
    },
    sybilConfig: {
      vouchScore: 0.91,
      geohashLen: 5
    },
    liveTrafficCount: 3120
  },
  {
    id: 'forgeos-builder',
    name: 'ForgeOS App Builder',
    category: 'Offline Sandboxed Compiler & AST Engine',
    repositoryPath: '/apps/forgeos-compiler',
    version: 'v3.0.2',
    packageDependencies: ['react', 'esprima', 'ast-types', 'recharts', 'lucide-react'],
    stripeSplitConfig: {
      platformSplitPct: 0.50,
      poolASplitPct: 0.70,
      poolBSplitPct: 0.15,
      poolCSplitPct: 0.15
    },
    c2paMetadata: {
      version: 'v2.1',
      signatureAlgo: 'ECDSA-SHA256'
    },
    sybilConfig: {
      vouchScore: 0.89,
      geohashLen: 5
    },
    liveTrafficCount: 5690
  },
  {
    id: 'rl-easy-flow',
    name: 'RL Easy Flow',
    category: 'Visual Logic Orchestrator & Node Trees',
    repositoryPath: '/apps/rl-easy-flow',
    version: 'v1.1.4',
    packageDependencies: ['react', 'react-flow-renderer', 'd3', 'lucide-react'],
    stripeSplitConfig: {
      platformSplitPct: 0.62, // VIOLATION: Extractive 62% platform retention (exceeds 50% limit)
      poolASplitPct: 0.55,    // VIOLATION: Creator Pool A is only 55% instead of 70%
      poolBSplitPct: 0.25,
      poolCSplitPct: 0.20
    },
    c2paMetadata: {
      version: 'v2.1',
      signatureAlgo: 'ECDSA-SHA256'
    },
    sybilConfig: {
      vouchScore: 0.87,
      geohashLen: 5
    },
    liveTrafficCount: 1840
  },
  {
    id: 'shadow-scraper-bot',
    name: 'Shadow Scraper Bot (Legacy Ingestion)',
    category: 'Unverified External Extraction Utility',
    repositoryPath: '/legacy/ingestion-crawler',
    version: 'v0.9.3-alpha',
    packageDependencies: [
      'react', 
      'openai',                 // BANNED
      'transformers',          // BANNED
      'viral-copyleft-scraper', // BANNED
      'axios'
    ],
    stripeSplitConfig: {
      platformSplitPct: 0.85,  // VIOLATION: Extractive 85% platform retention
      poolASplitPct: 0.10,     // VIOLATION: Creator Pool A is only 10%
      poolBSplitPct: 0.03,
      poolCSplitPct: 0.02
    },
    c2paMetadata: {
      version: 'v1.0',         // VIOLATION: Outdated C2PA standard
      signatureAlgo: 'MD5-RSA' // VIOLATION: Insecure hashing algo
    },
    sybilConfig: {
      vouchScore: 0.42,        // VIOLATION: Fails Sybil vouch threshold (< 0.85)
      geohashLen: 2            // VIOLATION: Insufficient geohash resolution
    },
    liveTrafficCount: 420
  }
];

export const ComplianceDashboard: React.FC = () => {
  const auditor = useMemo(() => new BadgeComplianceAuditor(), []);

  const [apps, setApps] = useState<RegisteredEcosystemApp[]>(INITIAL_APPS);
  const [auditResults, setAuditResults] = useState<Record<string, AuditResult>>({});
  const [selectedAppId, setSelectedAppId] = useState<string>(INITIAL_APPS[0].id);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [filterType, setFilterType] = useState<'all' | 'compliant' | 'dependency-violations' | 'royalty-violations'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [newDependencyInput, setNewDependencyInput] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Run audit for a single app
  const runAuditForApp = async (app: RegisteredEcosystemApp): Promise<AuditResult> => {
    return await auditor.auditApp(
      app.id,
      app.name,
      app.packageDependencies,
      app.stripeSplitConfig,
      app.c2paMetadata,
      app.sybilConfig
    );
  };

  // Run audit for all apps
  const runFullRepositoryAudit = async (currentApps: RegisteredEcosystemApp[] = apps) => {
    setIsScanning(true);
    setScanProgress(10);

    const newResults: Record<string, AuditResult> = {};
    const total = currentApps.length;

    for (let i = 0; i < total; i++) {
      const app = currentApps[i];
      const res = await runAuditForApp(app);
      newResults[app.id] = res;
      setScanProgress(Math.round(((i + 1) / total) * 100));
      // Short realistic micro-delay
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    setAuditResults(newResults);
    setIsScanning(false);
  };

  // Initial audit run on mount
  useEffect(() => {
    runFullRepositoryAudit(apps);
  }, []);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalApps = apps.length;
    let compliantCount = 0;
    let dependencyViolationCount = 0;
    let royaltyViolationCount = 0;
    let totalScore = 0;
    let totalBannedFound = 0;

    apps.forEach(app => {
      const audit = auditResults[app.id];
      if (audit) {
        totalScore += audit.score;
        if (audit.isCompliant) compliantCount++;
        if (!audit.details.zeroIngestionPassed || audit.bannedLibrariesFound.length > 0) {
          dependencyViolationCount++;
          totalBannedFound += audit.bannedLibrariesFound.length;
        }
        if (!audit.details.covenantIntegrityPassed) {
          royaltyViolationCount++;
        }
      }
    });

    const averageHealthScore = totalApps > 0 ? Math.round(totalScore / totalApps) : 0;

    return {
      totalApps,
      compliantCount,
      dependencyViolationCount,
      royaltyViolationCount,
      averageHealthScore,
      totalBannedFound
    };
  }, [apps, auditResults]);

  // Selected App Object & Audit Result
  const selectedApp = useMemo(() => {
    return apps.find(a => a.id === selectedAppId) || apps[0];
  }, [apps, selectedAppId]);

  const selectedAudit = useMemo(() => {
    return auditResults[selectedApp?.id];
  }, [auditResults, selectedApp]);

  // Quick Action: Fix Banned Dependencies (Quarantine & Strip)
  const handleQuarantineDependencies = async (appId: string) => {
    const target = apps.find(a => a.id === appId);
    if (!target) return;

    const cleanDeps = target.packageDependencies.filter(
      dep => !HUMAN_PROTOCOL_SPECIFICATION.zeroIngestion.bannedLibraries.includes(dep)
    );

    const updatedApp = { ...target, packageDependencies: cleanDeps };
    const updatedApps = apps.map(a => a.id === appId ? updatedApp : a);
    setApps(updatedApps);

    const newAudit = await runAuditForApp(updatedApp);
    setAuditResults(prev => ({ ...prev, [appId]: newAudit }));

    showToast(`Quarantined & removed toxic dependencies from ${target.name}. Cleanroom verified!`);
    if (newAudit.isCompliant) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Quick Action: Fix Royalty Split (Align with 50% People's Covenant)
  const handleAlignWithCovenant = async (appId: string) => {
    const target = apps.find(a => a.id === appId);
    if (!target) return;

    const compliantSplit = {
      platformSplitPct: HUMAN_PROTOCOL_SPECIFICATION.economicCovenant.initialPlatformSplitPct, // 0.50
      poolASplitPct: HUMAN_PROTOCOL_SPECIFICATION.economicCovenant.societyFundDistribution.poolA_CreatorMicroRoyaltiesPct, // 0.70
      poolBSplitPct: HUMAN_PROTOCOL_SPECIFICATION.economicCovenant.societyFundDistribution.poolB_UnregisteredEscrowPct, // 0.15
      poolCSplitPct: HUMAN_PROTOCOL_SPECIFICATION.economicCovenant.societyFundDistribution.poolC_CommunityLivingFloorPct // 0.15
    };

    const updatedApp = { ...target, stripeSplitConfig: compliantSplit };
    const updatedApps = apps.map(a => a.id === appId ? updatedApp : a);
    setApps(updatedApps);

    const newAudit = await runAuditForApp(updatedApp);
    setAuditResults(prev => ({ ...prev, [appId]: newAudit }));

    showToast(`Aligned ${target.name} with the 50% People's Covenant (70/15/15 distribution)!`);
    if (newAudit.isCompliant) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Toggle or add a dependency on the selected app
  const handleToggleSampleBannedDep = async (depName: string) => {
    if (!selectedApp) return;

    let updatedDeps: string[];
    if (selectedApp.packageDependencies.includes(depName)) {
      updatedDeps = selectedApp.packageDependencies.filter(d => d !== depName);
      showToast(`Removed test dependency: ${depName}`);
    } else {
      updatedDeps = [...selectedApp.packageDependencies, depName];
      showToast(`Injected test dependency: ${depName}`);
    }

    const updatedApp = { ...selectedApp, packageDependencies: updatedDeps };
    const updatedApps = apps.map(a => a.id === selectedApp.id ? updatedApp : a);
    setApps(updatedApps);

    const newAudit = await runAuditForApp(updatedApp);
    setAuditResults(prev => ({ ...prev, [selectedApp.id]: newAudit }));
  };

  // Add custom typed dependency
  const handleAddCustomDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDependencyInput.trim() || !selectedApp) return;

    const cleanInput = newDependencyInput.trim().toLowerCase();
    if (selectedApp.packageDependencies.includes(cleanInput)) {
      showToast(`Dependency '${cleanInput}' already exists.`);
      return;
    }

    const updatedDeps = [...selectedApp.packageDependencies, cleanInput];
    const updatedApp = { ...selectedApp, packageDependencies: updatedDeps };
    const updatedApps = apps.map(a => a.id === selectedApp.id ? updatedApp : a);
    setApps(updatedApps);
    setNewDependencyInput('');

    const newAudit = await runAuditForApp(updatedApp);
    setAuditResults(prev => ({ ...prev, [selectedApp.id]: newAudit }));
    showToast(`Added '${cleanInput}' to ${selectedApp.name}. Auditor re-evaluated!`);
  };

  // Remove specific dependency
  const handleRemoveDependency = async (depToRemove: string) => {
    if (!selectedApp) return;

    const updatedDeps = selectedApp.packageDependencies.filter(d => d !== depToRemove);
    const updatedApp = { ...selectedApp, packageDependencies: updatedDeps };
    const updatedApps = apps.map(a => a.id === selectedApp.id ? updatedApp : a);
    setApps(updatedApps);

    const newAudit = await runAuditForApp(updatedApp);
    setAuditResults(prev => ({ ...prev, [selectedApp.id]: newAudit }));
    showToast(`Removed '${depToRemove}' from ${selectedApp.name}`);
  };

  // Update Platform Split Percentage interactively
  const handleUpdatePlatformSplit = async (newPct: number) => {
    if (!selectedApp) return;

    const updatedSplit = {
      ...selectedApp.stripeSplitConfig,
      platformSplitPct: Number((newPct / 100).toFixed(4))
    };

    const updatedApp = { ...selectedApp, stripeSplitConfig: updatedSplit };
    const updatedApps = apps.map(a => a.id === selectedApp.id ? updatedApp : a);
    setApps(updatedApps);

    const newAudit = await runAuditForApp(updatedApp);
    setAuditResults(prev => ({ ...prev, [selectedApp.id]: newAudit }));
  };

  // Copy manifest to clipboard
  const handleCopyManifest = (appId: string) => {
    const audit = auditResults[appId];
    if (!audit) return;

    navigator.clipboard.writeText(JSON.stringify(audit, null, 2));
    setCopiedAppId(appId);
    showToast(`Audit Manifest for ${audit.appName} copied to clipboard!`);
    setTimeout(() => setCopiedAppId(null), 2500);
  };

  // Download Manifest JSON (Web Crypto SHA-256 C2PA-JUMBF-v2.1 & Omega Sync)
  const handleDownloadManifest = async (app: RegisteredEcosystemApp) => {
    const audit = auditResults[app.id];
    if (!audit) return;

    let attestedReport: Record<string, unknown> = { ...audit };
    let syncMessage = `Downloaded compliance report: compliance-audit-${app.id}.json`;

    try {
      const syncResult = await signAndSyncDeliverable(audit, {
        appId: app.id,
        title: `${app.name} Compliance Audit Report`,
        artifactType: 'compliance-audit',
        corridor: 'Global Pool C ($FOOD / $MED)',
      });
      attestedReport = {
        ...audit,
        c2paAttestation: syncResult.manifest,
        syncedToOmega: syncResult.syncedToOmega,
      };
      syncMessage = syncResult.syncedToOmega
        ? `Signed C2PA-JUMBF-v2.1 report (${syncResult.manifest.sha256.slice(0, 12)}...) synced to Omega Hub & downloaded.`
        : `Signed C2PA-JUMBF-v2.1 report (${syncResult.manifest.sha256.slice(0, 12)}...) downloaded.`;
    } catch {
      // Fallback to unsigned audit JSON if offline
    }

    const blob = new Blob([JSON.stringify(attestedReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-audit-${app.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(syncMessage);
  };

  // Filtered Apps List
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const audit = auditResults[app.id];
      const matchesSearch = 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.repositoryPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageDependencies.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'compliant') {
        return audit?.isCompliant;
      }
      if (filterType === 'dependency-violations') {
        return audit && (!audit.details.zeroIngestionPassed || audit.bannedLibrariesFound.length > 0);
      }
      if (filterType === 'royalty-violations') {
        return audit && !audit.details.covenantIntegrityPassed;
      }
      return true;
    });
  }, [apps, auditResults, filterType, searchQuery]);

  return (
    <div className="space-y-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#101B18] text-[#F0FDF4] px-4 py-3 rounded-xl border border-[#34D399]/40 shadow-xl text-xs font-mono animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#34D399]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E5E0D8] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#3D6E50]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3ED] text-[#3D6E50] border border-[#C5DEC9] text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>THE H.U.M.A.N. PROTOCOL • REAL-TIME AUDIT ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2D2926] tracking-tight">
              Repository Compliance & Integrity Dashboard
            </h1>
            <p className="text-sm text-[#6A655C] leading-relaxed">
              Automated 5-stage cryptographic auditing powered by <code className="text-[#3D6E50] font-mono font-bold">BadgeComplianceAuditor</code>. 
              Monitors Zero-Ingestion cleanrooms, enforces the 50% People’s Covenant royalty splits, verifies C2PA Content Credentials, 
              and guards against non-consensual AI scraping.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => runFullRepositoryAudit()}
              disabled={isScanning}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isScanning
                  ? 'bg-[#E5E0D8] text-[#6A655C] cursor-not-allowed'
                  : 'bg-[#3D6E50] hover:bg-[#2D533C] text-white hover:shadow-md'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? `Scanning (${scanProgress}%)` : 'Run Full Repository Scan'}</span>
            </button>
            <div className="px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#E5E0D8] text-xs font-mono text-[#5A5A40] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#3D6E50]" />
              <span>Standard: <strong className="text-[#2D2926]">FT-2026 / C2PA v2.1</strong></span>
            </div>
          </div>
        </div>

        {/* Progress bar during scan */}
        {isScanning && (
          <div className="mt-6 w-full bg-[#E5E0D8] rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#3D6E50] h-1.5 transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Health Score */}
        <div className="rounded-xl border border-[#E5E0D8] bg-[#FDFCF9] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#6A655C]">
            <span>Average Health Score</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              summaryMetrics.averageHealthScore >= 80 
                ? 'bg-[#EBF3ED] text-[#3D6E50]' 
                : 'bg-[#FDF2F0] text-[#C25438]'
            }`}>
              {summaryMetrics.averageHealthScore >= 80 ? 'PRISTINE' : 'ACTION REQUIRED'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#2D2926] font-mono">
              {summaryMetrics.averageHealthScore}%
            </span>
            <span className="text-xs text-[#6A655C]">across {summaryMetrics.totalApps} repository apps</span>
          </div>
          <div className="w-full bg-[#E5E0D8] rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${
                summaryMetrics.averageHealthScore >= 80 ? 'bg-[#3D6E50]' : 'bg-[#D67D5C]'
              }`}
              style={{ width: `${summaryMetrics.averageHealthScore}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Fully Compliant Apps */}
        <div className="rounded-xl border border-[#E5E0D8] bg-[#FDFCF9] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#6A655C]">
            <span>Fully Compliant Apps</span>
            <CheckCircle2 className="w-4 h-4 text-[#3D6E50]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#3D6E50] font-mono">
              {summaryMetrics.compliantCount}
            </span>
            <span className="text-xs text-[#6A655C]">/ {summaryMetrics.totalApps} verified</span>
          </div>
          <p className="text-xs text-[#6A655C]">
            Authorized for ethical trust marks &amp; live SDK injection.
          </p>
        </div>

        {/* Metric 3: Flagged Dependencies */}
        <div className={`rounded-xl border p-5 shadow-2xs space-y-2 transition-all ${
          summaryMetrics.dependencyViolationCount > 0
            ? 'border-[#EECDBC] bg-[#FDF7F5]'
            : 'border-[#E5E0D8] bg-[#FDFCF9]'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={summaryMetrics.dependencyViolationCount > 0 ? 'text-[#C25438] font-bold' : 'text-[#6A655C]'}>
              Dependency Violations
            </span>
            <AlertOctagon className={`w-4 h-4 ${summaryMetrics.dependencyViolationCount > 0 ? 'text-[#C25438]' : 'text-[#6A655C]'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${summaryMetrics.dependencyViolationCount > 0 ? 'text-[#C25438]' : 'text-[#2D2926]'}`}>
              {summaryMetrics.dependencyViolationCount}
            </span>
            <span className="text-xs text-[#6A655C]">({summaryMetrics.totalBannedFound} banned libs found)</span>
          </div>
          <p className="text-xs text-[#6A655C]">
            {summaryMetrics.dependencyViolationCount > 0
              ? 'Unauthorized scraping/training libraries detected.'
              : 'Zero ingestion libraries active. Safe cleanroom.'}
          </p>
        </div>

        {/* Metric 4: Royalty Split Violations */}
        <div className={`rounded-xl border p-5 shadow-2xs space-y-2 transition-all ${
          summaryMetrics.royaltyViolationCount > 0
            ? 'border-[#F0DCB5] bg-[#FDFBF7]'
            : 'border-[#E5E0D8] bg-[#FDFCF9]'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={summaryMetrics.royaltyViolationCount > 0 ? 'text-[#B45309] font-bold' : 'text-[#6A655C]'}>
              Royalty Split Violations
            </span>
            <DollarSign className={`w-4 h-4 ${summaryMetrics.royaltyViolationCount > 0 ? 'text-[#B45309]' : 'text-[#6A655C]'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${summaryMetrics.royaltyViolationCount > 0 ? 'text-[#B45309]' : 'text-[#2D2926]'}`}>
              {summaryMetrics.royaltyViolationCount}
            </span>
            <span className="text-xs text-[#6A655C]">apps non-compliant</span>
          </div>
          <p className="text-xs text-[#6A655C]">
            {summaryMetrics.royaltyViolationCount > 0
              ? 'Extractive platform retention (>50%) detected.'
              : 'Strict 50% People’s Covenant observed.'}
          </p>
        </div>
      </div>

      {/* ACTION CENTERS: Flagged Dependencies & Royalty Violations Banners */}
      {(summaryMetrics.dependencyViolationCount > 0 || summaryMetrics.royaltyViolationCount > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Action Center 1: Toxic Dependencies Quarantine */}
          {summaryMetrics.dependencyViolationCount > 0 && (
            <div className="rounded-xl border border-[#EECDBC] bg-[#FAF0EC] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-[#C25438]">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <h3 className="font-bold text-sm text-[#2D2926]">
                    Action Required: Flagged Toxic Dependencies ({summaryMetrics.totalBannedFound})
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C25438] text-white">
                  HIGH RISK
                </span>
              </div>
              <p className="text-xs text-[#6A655C] leading-relaxed">
                The Zero-Ingestion Cleanroom rule blocks packages known to siphon training data or scrape without explicit author consent (EU AI Act Art. 50/53).
              </p>
              
              <div className="space-y-2">
                {apps
                  .filter(app => {
                    const a = auditResults[app.id];
                    return a && a.bannedLibrariesFound.length > 0;
                  })
                  .map(app => {
                    const audit = auditResults[app.id]!;
                    return (
                      <div key={app.id} className="bg-white rounded-lg p-3 border border-[#EECDBC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                            <span>{app.name}</span>
                            <code className="text-[10px] text-[#6A655C] font-mono">({app.repositoryPath})</code>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {audit.bannedLibrariesFound.map(dep => (
                              <span key={dep} className="px-1.5 py-0.5 rounded bg-[#FDF2F0] text-[#C25438] font-mono text-[10px] border border-[#F5C2B6] flex items-center gap-1">
                                <Ban className="w-2.5 h-2.5" />
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuarantineDependencies(app.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#C25438] hover:bg-[#A9432A] text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Quarantine &amp; Strip</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Action Center 2: Royalty Split Alignment */}
          {summaryMetrics.royaltyViolationCount > 0 && (
            <div className="rounded-xl border border-[#F0DCB5] bg-[#FAF6EE] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-[#B45309]">
                  <Scale className="w-5 h-5 flex-shrink-0" />
                  <h3 className="font-bold text-sm text-[#2D2926]">
                    Action Required: Royalty Split Violations ({summaryMetrics.royaltyViolationCount})
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#B45309] text-white">
                  COVENANT BREACH
                </span>
              </div>
              <p className="text-xs text-[#6A655C] leading-relaxed">
                The 50% People’s Covenant dictates an initial 50% platform split maximum, distributed into 70% direct creator micro-royalties (Pool A), 15% escrow (Pool B), and 15% community living floors (Pool C).
              </p>

              <div className="space-y-2">
                {apps
                  .filter(app => {
                    const a = auditResults[app.id];
                    return a && !a.details.covenantIntegrityPassed;
                  })
                  .map(app => {
                    const split = app.stripeSplitConfig;
                    return (
                      <div key={app.id} className="bg-white rounded-lg p-3 border border-[#F0DCB5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                            <span>{app.name}</span>
                            <span className="text-[10px] text-[#B45309] font-mono font-bold">
                              [Platform: {(split.platformSplitPct * 100).toFixed(0)}% | Pool A: {(split.poolASplitPct * 100).toFixed(0)}%]
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6A655C] mt-0.5">
                            Expected: 50% Platform / 70% Creator Micro-Royalties (Pool A).
                          </p>
                        </div>
                        <button
                          onClick={() => handleAlignWithCovenant(app.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#3D6E50] hover:bg-[#2D533C] text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Align with Covenant</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Workspace: Left = App Directory / Matrix, Right = Detailed Auditor Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Repository Apps List & Filter (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#2D2926] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5A5A40]" />
              <span>Repository Apps ({filteredApps.length})</span>
            </h2>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-lg border border-[#E5E0D8] text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-[#3D6E50] text-white font-bold' : 'text-[#6A655C] hover:text-[#2D2926]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('compliant')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                  filterType === 'compliant' ? 'bg-[#3D6E50] text-white font-bold' : 'text-[#6A655C] hover:text-[#2D2926]'
                }`}
              >
                Clean
              </button>
              <button
                onClick={() => setFilterType('dependency-violations')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                  filterType === 'dependency-violations' ? 'bg-[#C25438] text-white font-bold' : 'text-[#6A655C] hover:text-[#2D2926]'
                }`}
              >
                Toxic Deps
              </button>
              <button
                onClick={() => setFilterType('royalty-violations')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                  filterType === 'royalty-violations' ? 'bg-[#B45309] text-white font-bold' : 'text-[#6A655C] hover:text-[#2D2926]'
                }`}
              >
                Split
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6A655C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, paths, or dependencies..."
              className="w-full bg-white border border-[#E5E0D8] rounded-xl pl-9 pr-3 py-2 text-xs text-[#2D2926] placeholder-[#8C827A] focus:outline-none focus:border-[#3D6E50]"
            />
          </div>

          {/* App Cards List */}
          <div className="space-y-3">
            {filteredApps.map(app => {
              const audit = auditResults[app.id];
              const isSelected = selectedAppId === app.id;
              const hasBannedDeps = audit && audit.bannedLibrariesFound.length > 0;
              const hasSplitViolation = audit && !audit.details.covenantIntegrityPassed;

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left relative ${
                    isSelected
                      ? 'border-[#3D6E50] bg-[#FAF7F0] shadow-sm ring-2 ring-[#3D6E50]/15'
                      : 'border-[#E5E0D8] bg-[#FDFCF9] hover:border-[#5A5A40]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#2D2926]">{app.name}</h3>
                        <span className="text-[10px] font-mono text-[#8C827A]">{app.version}</span>
                      </div>
                      <p className="text-xs text-[#6A655C] font-mono mt-0.5">{app.repositoryPath}</p>
                    </div>

                    {/* Score / Compliance Badge */}
                    <div className="text-right flex-shrink-0">
                      {audit ? (
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            audit.isCompliant
                              ? 'bg-[#EBF3ED] text-[#3D6E50] border border-[#C5DEC9]'
                              : 'bg-[#FDF2F0] text-[#C25438] border border-[#F5C2B6]'
                          }`}>
                            {audit.isCompliant ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>{audit.score}%</span>
                          </span>
                          <span className="text-[9.5px] font-mono text-[#8C827A] mt-0.5">
                            {audit.isCompliant ? 'Passed (5/5)' : 'Flagged'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-[#8C827A]">Auditing...</span>
                      )}
                    </div>
                  </div>

                  {/* Violation Pills */}
                  {(hasBannedDeps || hasSplitViolation) && (
                    <div className="mt-2.5 pt-2 border-t border-[#E5E0D8] flex flex-wrap gap-1.5">
                      {hasBannedDeps && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FDF2F0] text-[#C25438] border border-[#F5C2B6] flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" />
                          {audit?.bannedLibrariesFound.length} Toxic Dep(s)
                        </span>
                      )}
                      {hasSplitViolation && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF6EE] text-[#B45309] border border-[#F0DCB5] flex items-center gap-1">
                          <Scale className="w-2.5 h-2.5" />
                          Split: {(app.stripeSplitConfig.platformSplitPct * 100).toFixed(0)}% Plat
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clean State Pill */}
                  {audit && audit.isCompliant && (
                    <div className="mt-2.5 pt-2 border-t border-[#E5E0D8] flex items-center justify-between text-[11px] text-[#3D6E50] font-mono">
                      <span>✓ Cleanroom Zero-Ingestion</span>
                      <span>50/50 Covenant</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Detailed Auditor Inspector & Sandbox (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#E5E0D8] bg-[#FDFCF9] p-6 shadow-xs space-y-6">
            {/* Header with App Info & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E0D8]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#2D2926]">{selectedApp.name}</h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FAF7F0] border border-[#E5E0D8] text-[#5A5A40]">
                    {selectedApp.category}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6A655C] font-mono mt-1">
                  <span>Repo: <code className="text-[#2D2926]">{selectedApp.repositoryPath}</code></span>
                  <span>•</span>
                  <span>Version: {selectedApp.version}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyManifest(selectedApp.id)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF7F0] border border-[#DCD5CA] text-xs font-mono text-[#5A5A40] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy Audit JSON"
                >
                  {copiedAppId === selectedApp.id ? <Check className="w-3.5 h-3.5 text-[#3D6E50]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAppId === selectedApp.id ? 'Copied' : 'JSON'}</span>
                </button>
                <button
                  onClick={() => handleDownloadManifest(selectedApp)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF7F0] border border-[#DCD5CA] text-xs font-mono text-[#5A5A40] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download Manifest"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Report</span>
                </button>
              </div>
            </div>

            {/* Comprehensive 5-Stage Audit Synthesis Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A5A40]">
                  5-Stage Protocol Audit Breakdown
                </h3>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  selectedAudit?.isCompliant
                    ? 'bg-[#EBF3ED] text-[#3D6E50] border border-[#C5DEC9]'
                    : 'bg-[#FDF2F0] text-[#C25438] border border-[#F5C2B6]'
                }`}>
                  Score: {selectedAudit ? `${selectedAudit.score}%` : 'Calculating...'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Stage 1: Zero-Ingestion */}
                <div className={`p-3.5 rounded-xl border ${
                  selectedAudit?.details.zeroIngestionPassed 
                    ? 'border-[#C5DEC9] bg-[#F7FAF8]' 
                    : 'border-[#F5C2B6] bg-[#FDF2F0]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#3D6E50]" />
                      Stage 1: Cleanroom
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      selectedAudit?.details.zeroIngestionPassed ? 'bg-[#EBF3ED] text-[#3D6E50]' : 'bg-[#C25438] text-white'
                    }`}>
                      {selectedAudit?.details.zeroIngestionPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6A655C] mt-1">
                    {selectedAudit?.details.zeroIngestionPassed 
                      ? 'No blacklisted AI scraping libraries found in package manifest.' 
                      : `Banned libs found: ${selectedAudit?.bannedLibrariesFound.join(', ')}`}
                  </p>
                </div>

                {/* Stage 2: 50% People's Covenant */}
                <div className={`p-3.5 rounded-xl border ${
                  selectedAudit?.details.covenantIntegrityPassed 
                    ? 'border-[#C5DEC9] bg-[#F7FAF8]' 
                    : 'border-[#F0DCB5] bg-[#FAF6EE]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#3D6E50]" />
                      Stage 2: Covenant
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      selectedAudit?.details.covenantIntegrityPassed ? 'bg-[#EBF3ED] text-[#3D6E50]' : 'bg-[#B45309] text-white'
                    }`}>
                      {selectedAudit?.details.covenantIntegrityPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6A655C] mt-1">
                    {selectedAudit?.details.covenantIntegrityPassed 
                      ? 'Stripe Connect split strictly capped at 50% with 70/15/15 pool ratios.' 
                      : 'Extractive split or non-compliant creator fund distribution.'}
                  </p>
                </div>

                {/* Stage 3: C2PA Provenance */}
                <div className={`p-3.5 rounded-xl border ${
                  selectedAudit?.details.c2paSignaturePassed 
                    ? 'border-[#C5DEC9] bg-[#F7FAF8]' 
                    : 'border-[#F5C2B6] bg-[#FDF2F0]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-[#3D6E50]" />
                      Stage 3: C2PA Proofs
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      selectedAudit?.details.c2paSignaturePassed ? 'bg-[#EBF3ED] text-[#3D6E50]' : 'bg-[#C25438] text-white'
                    }`}>
                      {selectedAudit?.details.c2paSignaturePassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6A655C] mt-1">
                    {selectedAudit?.details.c2paSignaturePassed 
                      ? 'JUMBF v2.1 tamper-evident assertion schema with ECDSA-SHA256.' 
                      : 'Invalid C2PA version or weak signature algorithm.'}
                  </p>
                </div>

                {/* Stage 4: Biometric-Free Proof-of-Humanity */}
                <div className={`p-3.5 rounded-xl border ${
                  selectedAudit?.details.pohSybilPassed 
                    ? 'border-[#C5DEC9] bg-[#F7FAF8]' 
                    : 'border-[#F5C2B6] bg-[#FDF2F0]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-[#3D6E50]" />
                      Stage 4: Sybil Guard
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      selectedAudit?.details.pohSybilPassed ? 'bg-[#EBF3ED] text-[#3D6E50]' : 'bg-[#C25438] text-white'
                    }`}>
                      {selectedAudit?.details.pohSybilPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6A655C] mt-1">
                    {selectedAudit?.details.pohSybilPassed 
                      ? 'Decentralized vouch circles (>= 0.85) without biometric capture.' 
                      : 'Insufficient Sybil resistance vouch threshold or improper geohash.'}
                  </p>
                </div>
              </div>
            </div>

            {/* INTERACTIVE SECTION 1: Dependency Inspector & Cleanroom Sandbox */}
            <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-[#3D6E50]" />
                    <span>Dependency Cleanroom Inspector ({selectedApp.packageDependencies.length})</span>
                  </h4>
                  <p className="text-[11px] text-[#6A655C]">
                    Inspect active dependencies. Test injecting or removing packages to see real-time auditor reaction.
                  </p>
                </div>

                {selectedAudit && selectedAudit.bannedLibrariesFound.length > 0 && (
                  <button
                    onClick={() => handleQuarantineDependencies(selectedApp.id)}
                    className="px-2.5 py-1 rounded bg-[#C25438] hover:bg-[#A9432A] text-white text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Clean All</span>
                  </button>
                )}
              </div>

              {/* Active Dependencies Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-[#FAF8F5] rounded-lg border border-[#E5E0D8]">
                {selectedApp.packageDependencies.map(dep => {
                  const isBanned = HUMAN_PROTOCOL_SPECIFICATION.zeroIngestion.bannedLibraries.includes(dep);
                  return (
                    <span 
                      key={dep} 
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                        isBanned 
                          ? 'bg-[#FDF2F0] text-[#C25438] border border-[#F5C2B6] font-bold' 
                          : 'bg-white text-[#2D2926] border border-[#DCD5CA]'
                      }`}
                    >
                      {isBanned && <Ban className="w-3 h-3 text-[#C25438]" />}
                      <span>{dep}</span>
                      <button
                        onClick={() => handleRemoveDependency(dep)}
                        className="text-[#8C827A] hover:text-[#C25438] cursor-pointer"
                        title="Remove dependency"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Add Custom Dependency & Quick Sandbox Test Toggles */}
              <div className="pt-2 border-t border-[#E5E0D8] space-y-2">
                <form onSubmit={handleAddCustomDependency} className="flex gap-2">
                  <input
                    type="text"
                    value={newDependencyInput}
                    onChange={(e) => setNewDependencyInput(e.target.value)}
                    placeholder="Add package (e.g. zod, openai, axios)..."
                    className="flex-1 bg-[#FAF8F5] border border-[#DCD5CA] rounded-lg px-3 py-1.5 text-xs font-mono text-[#2D2926] placeholder-[#8C827A] focus:outline-none focus:border-[#3D6E50]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#3D6E50] hover:bg-[#2D533C] text-white text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                {/* Quick Simulation Toggles */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#6A655C]">
                  <span>Test Injection:</span>
                  {['openai', 'transformers', 'viral-copyleft-scraper', 'anthropic'].map(sampleBanned => {
                    const isPresent = selectedApp.packageDependencies.includes(sampleBanned);
                    return (
                      <button
                        key={sampleBanned}
                        onClick={() => handleToggleSampleBannedDep(sampleBanned)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                          isPresent 
                            ? 'bg-[#C25438] text-white border-[#A9432A]' 
                            : 'bg-[#FAF8F5] text-[#C25438] border-[#EECDBC] hover:bg-[#FDF2F0]'
                        }`}
                      >
                        {isPresent ? `Remove ${sampleBanned}` : `+ ${sampleBanned}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* INTERACTIVE SECTION 2: Royalty Split & Economic Covenant Sandbox */}
            <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#3D6E50]" />
                    <span>50% People’s Covenant &amp; Royalty Split Engine</span>
                  </h4>
                  <p className="text-[11px] text-[#6A655C]">
                    Protocol requirement: Initial platform retention must not exceed 50%. Remainder distributed 70/15/15.
                  </p>
                </div>

                {!selectedAudit?.details.covenantIntegrityPassed && (
                  <button
                    onClick={() => handleAlignWithCovenant(selectedApp.id)}
                    className="px-2.5 py-1 rounded bg-[#3D6E50] hover:bg-[#2D533C] text-white text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Enforce 50% Covenant</span>
                  </button>
                )}
              </div>

              {/* Slider for Platform Split Percentage */}
              <div className="space-y-2 bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E0D8]">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#6A655C]">Platform Retention Split:</span>
                  <span className={`font-bold ${
                    selectedApp.stripeSplitConfig.platformSplitPct <= 0.50 
                      ? 'text-[#3D6E50]' 
                      : 'text-[#C25438]'
                  }`}>
                    {(selectedApp.stripeSplitConfig.platformSplitPct * 100).toFixed(1)}% {selectedApp.stripeSplitConfig.platformSplitPct > 0.50 ? '(Extractive Violation)' : '(Compliant)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  step="1"
                  value={Math.round(selectedApp.stripeSplitConfig.platformSplitPct * 100)}
                  onChange={(e) => handleUpdatePlatformSplit(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#DCD5CA] rounded-lg appearance-none cursor-pointer accent-[#3D6E50]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8C827A]">
                  <span>5% (Compressed Heartbeat)</span>
                  <span className="text-[#3D6E50] font-bold">50% Covenant Baseline</span>
                  <span>95% (Predatory Monopoly)</span>
                </div>
              </div>

              {/* Pool Distribution Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8]">
                  <span className="text-[10px] text-[#6A655C] block">Pool A (Creators)</span>
                  <span className="text-sm font-bold text-[#3D6E50]">
                    {(selectedApp.stripeSplitConfig.poolASplitPct * 100).toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-[#8C827A] block">Target: 70%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8]">
                  <span className="text-[10px] text-[#6A655C] block">Pool B (Escrow)</span>
                  <span className="text-sm font-bold text-[#5A5A40]">
                    {(selectedApp.stripeSplitConfig.poolBSplitPct * 100).toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-[#8C827A] block">Target: 15%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8]">
                  <span className="text-[10px] text-[#6A655C] block">Pool C (Living Floor)</span>
                  <span className="text-sm font-bold text-[#D67D5C]">
                    {(selectedApp.stripeSplitConfig.poolCSplitPct * 100).toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-[#8C827A] block">Target: 15%</span>
                </div>
              </div>
            </div>

            {/* Issued Ethical Badges & Final Auditor Verdict */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E0D8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5A5A40] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#3D6E50]" />
                  <span>Issued Ethical Badges</span>
                </span>
                <span className="text-xs font-mono text-[#8C827A]">
                  Audited: {selectedAudit?.timestamp ? new Date(selectedAudit.timestamp).toLocaleTimeString() : 'Pending'}
                </span>
              </div>

              {selectedAudit && selectedAudit.issuedBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedAudit.issuedBadges.map(badge => (
                    <span 
                      key={badge}
                      className="px-3 py-1.5 rounded-lg bg-[#EBF3ED] text-[#3D6E50] border border-[#C5DEC9] text-xs font-mono font-bold flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#F5C2B6] text-xs font-mono text-[#C25438] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Badges withheld. App must resolve all 5 compliance stages before ethical certification.</span>
                </div>
              )}

              {/* Official Auditor Message Output */}
              {selectedAudit && (
                <div className="p-3 rounded-lg bg-white border border-[#E5E0D8] font-mono text-[11px] text-[#2D2926] leading-relaxed">
                  <span className="text-[#8C827A] font-bold block mb-1">AUDIT VERDICT MESSAGE:</span>
                  <p className={selectedAudit.isCompliant ? 'text-[#3D6E50]' : 'text-[#C25438]'}>
                    {selectedAudit.auditMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
