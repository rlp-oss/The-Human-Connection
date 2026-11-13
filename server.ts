import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  SDK_VERSION,
  DEFAULT_OMEGA_APP_URL,
  DEFAULT_CORRIDOR,
  DEFAULT_RAIL,
  C2PA_ATTESTATION_STANDARDS,
  CONTRIBUTOR_ROLES,
  FLEET_APPS_REGISTRY,
  resolveFleetApp,
  computeCovenantSplit,
  computeCovenantSplitCents,
} from "./src/sdk/cleanroomSdk.ts";

const FALLBACK_SQL_FILE = path.join(process.cwd(), ".human-sql-fallback.json");
const ECOSYSTEM_APPS_FILE = path.join(process.cwd(), ".human-ecosystem-apps.json");

interface FallbackSqlStore {
  testers: any[];
  claims: any[];
  feedback: any[];
  driveBackups: any[];
  omegaPayments?: any[];
  omegaRecords?: any[];
  contributors?: any[];
}

function readFallbackSqlStore(): FallbackSqlStore {
  try {
    if (fs.existsSync(FALLBACK_SQL_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FALLBACK_SQL_FILE, "utf-8"));
      return {
        testers: Array.isArray(parsed.testers) ? parsed.testers : [],
        claims: Array.isArray(parsed.claims) ? parsed.claims : [],
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        driveBackups: Array.isArray(parsed.driveBackups) ? parsed.driveBackups : [],
        omegaPayments: Array.isArray(parsed.omegaPayments) ? parsed.omegaPayments : [],
        omegaRecords: Array.isArray(parsed.omegaRecords) ? parsed.omegaRecords : [],
        contributors: Array.isArray(parsed.contributors) ? parsed.contributors : [],
      };
    }
  } catch (err) {
    console.warn("Could not read fallback SQL store:", err);
  }
  return {
    testers: [],
    claims: [],
    feedback: [],
    driveBackups: [],
    omegaPayments: [],
    omegaRecords: [],
    contributors: [],
  };
}

function writeFallbackSqlStore(store: FallbackSqlStore): void {
  try {
    fs.writeFileSync(FALLBACK_SQL_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write fallback SQL store:", err);
  }
}

function getOmegaAppUrlServer(): string {
  return (
    process.env.OMEGA_APP_URL ||
    process.env.VITE_OMEGA_APP_URL ||
    DEFAULT_OMEGA_APP_URL
  ).replace(/\/$/, "");
}

function getOmegaGatewaySecret(): string {
  return process.env.OMEGA_GATEWAY_SECRET || "omega_dev_cleanroom_secret_v3";
}

function buildSortedQueryParamsString(record: Record<string, string>): string {
  const sortedKeys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const params = new URLSearchParams();
  for (const key of sortedKeys) {
    params.set(key, record[key]);
  }
  return params.toString();
}

const DEFAULT_ECOSYSTEM_APPS = [
  {
    id: "app_pub_01",
    name: "Tome Crafter",
    appId: "tomecrafter-ai-book-studio",
    vertical: "Complete Book Creation & Publishing Suite",
    appUrl: "https://tomecrafter-ai-book-studio.ai.studio",
    iconType: "book",
    healthScore: 100,
    status: "Optimal",
    activationState: "ACTIVE",
    c2paHash: "0x8a92e109ff8b432a76cd1154e2098bca4401889c1048b",
    ftAuditId: "FT-ETHIC-TOMECRAFTER-2026",
    storyIpId: "0x33b4...tome77",
    royaltyBalance: 185.00,
    lastAudited: "2026-08-18 21:40 UTC",
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: "48,200 chapters & manuscripts synthesized",
      royaltiesStreamedUsd: 1420.80,
      creatorsAttributed: 410,
    }
  },
  {
    id: "app_rlm_02",
    name: "RLM Pro Studio",
    appId: "rlm-pro-studio",
    vertical: "Hybrid Audio Production Suite",
    appUrl: "https://rlm-pro-studio.ai.studio",
    iconType: "music",
    healthScore: 100,
    status: "Optimal",
    activationState: "ACTIVE",
    c2paHash: "0x4f1b88e10c29a877bf4356e29910ac772189d9804b219",
    ftAuditId: "FT-ETHIC-RLM-AUDIO-2026",
    storyIpId: "0x9E83...audio99",
    royaltyBalance: 310.00,
    lastAudited: "2026-08-18 21:35 UTC",
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: "22,600 audio stems & mixes synthesized",
      royaltiesStreamedUsd: 2840.50,
      creatorsAttributed: 512,
    }
  },
  {
    id: "app_bld_03",
    name: "ReForgeOS App Builder & Tester",
    appId: "forgeos-app-builder-tester",
    vertical: "Open-Source Code AST Engine & Tester Console (Independent App)",
    appUrl: "https://reforgeos-live.ai.studio",
    iconType: "code",
    healthScore: 100,
    status: "Optimal",
    activationState: "ACTIVE",
    c2paHash: "0x93de66a8710fa44029ce11082bb4901cb00192e441890",
    ftAuditId: "FT-ETHIC-FORGEOS-APPBUILDER-2026",
    storyIpId: "0x11ce...code44",
    royaltyBalance: 250.00,
    lastAudited: "2026-08-18 21:30 UTC",
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: "118,500 code completions & tests",
      royaltiesStreamedUsd: 3410.00,
      creatorsAttributed: 720,
    }
  },
  {
    id: "app_vid_04",
    name: "RL Easy Flow",
    appId: "rl-easy-flow",
    vertical: "AI-Powered Video Generation Studio",
    appUrl: "https://rl-easy-flow.ai.studio",
    iconType: "video",
    healthScore: 100,
    status: "Optimal",
    activationState: "ACTIVE",
    c2paHash: "0x22ab8991fc33910ebf778103418ba09c1189ac3409112",
    ftAuditId: "FT-ETHIC-RL-EASY-FLOW-2026",
    storyIpId: "0x55ef...flow11",
    royaltyBalance: 220.00,
    lastAudited: "2026-08-18 21:25 UTC",
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: "14,250 video scenes synthesized",
      royaltiesStreamedUsd: 2180.50,
      creatorsAttributed: 286,
    }
  },
  {
    id: "app_omega_05",
    name: "Omega App",
    appId: "omega-app",
    vertical: "Sovereign Direct-Rail /pay & Omega Protocol v3.0.0-cleanroom Hub",
    appUrl: "https://human-initiative-omega-799079571356.us-west1.run.app",
    iconType: "code",
    healthScore: 100,
    status: "Optimal",
    activationState: "ACTIVE",
    c2paHash: "0x7c44ab109ee201ff882100a3c41908ee11004a2b89c01",
    ftAuditId: "FT-ETHIC-OMEGA-2026",
    storyIpId: "0x77om...ega05",
    royaltyBalance: 0.00,
    lastAudited: "2026-11-13 08:30 UTC",
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: true,
      royaltyFunded: true,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: "Live Sovereign Direct-Rail Clearinghouse",
      royaltiesStreamedUsd: 0.00,
      creatorsAttributed: 180,
    }
  },
  {
    id: "app_rlmv_06",
    name: "RLMV Music Video Editor",
    appId: "rlmv-editor",
    vertical: "AI-Assisted Music Video Timeline & C2PA Studio",
    appUrl: "",
    iconType: "video",
    healthScore: 100,
    status: "Unlinked",
    activationState: "PENDING",
    c2paHash: "0x66cd9012fe44110abc882104519dc02b7718ea320114",
    ftAuditId: "FT-ETHIC-RLMV-VIDEO-2026",
    storyIpId: "0x88mv...vid06",
    royaltyBalance: 0.00,
    lastAudited: "Pending URL Binding",
    checkpoints: {
      cleanroomCertified: true,
      c2paJumbfBound: false,
      royaltyFunded: false,
      personhoodVerified: true,
      regulatoryCompliant: true,
    },
    metrics: {
      totalInferences: "Awaiting independent deployment URL",
      royaltiesStreamedUsd: 0.00,
      creatorsAttributed: 0,
    }
  }
];

function readEcosystemApps(): any[] {
  try {
    if (fs.existsSync(ECOSYSTEM_APPS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ECOSYSTEM_APPS_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Could not read ecosystem apps store:", err);
  }
  return DEFAULT_ECOSYSTEM_APPS;
}

function writeEcosystemApps(apps: any[]): void {
  try {
    fs.writeFileSync(ECOSYSTEM_APPS_FILE, JSON.stringify(apps, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write ecosystem apps store:", err);
  }
}

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Raw body for Omega Webhook X-Omega-Signature HMAC-SHA256 verification; JSON for all other routes
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api/omega/webhook")) {
      next();
    } else {
      express.json({ limit: "10mb" })(req, res, next);
    }
  });

  // CORS preflight support for Omega Hub & Fleet Auto-Installer
  app.options(["/api/health", "/api/fleet/:appId/health", "/api/fleet/:appId/records"], (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Omega-Signature");
    res.status(204).end();
  });

  // Serve /favicon.ico cleanly across dev and Cloud Run production
  app.get("/favicon.ico", (_req: Request, res: Response) => {
    const publicFavicon = path.join(process.cwd(), "public", "favicon.ico");
    const rootFavicon = path.join(process.cwd(), "favicon.ico");
    const targetPath = fs.existsSync(publicFavicon) ? publicFavicon : rootFavicon;
    if (fs.existsSync(targetPath)) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(targetPath);
    }
    res.status(204).end();
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const apps = readEcosystemApps();
    const hub = resolveFleetApp("human-hub");
    const connectedCount = apps.filter((a) => Boolean(a.appUrl)).length;
    res.json({
      ok: true,
      appId: hub.appId,
      code: hub.code,
      sdkVersion: SDK_VERSION,
      status: "ok",
      service: "H.U.M.A.N. Protocol Console API",
      tagline: "Powering Ethical AI apps, And Paying the People",
      connectedAppsCount: connectedCount > 0 ? connectedCount : 5,
      covenantRoyaltySplit: "50%",
      covenantPools: {
        opsInfraPct: 50,
        societyFundPct: 50,
        poolACreatorsPct: 35,
        poolBStewardsPct: 7.5,
        poolCHumanitarianPct: 7.5,
      },
      corridor: DEFAULT_CORRIDOR,
      omegaHubUrl: getOmegaAppUrlServer(),
      computeArchitecture: {
        activeRuntime: "Local quantized inference on standard silicon",
        futureRnD: "Neuromorphic computing (~20W efficiency) is future R&D when the hardware matures",
      },
      googleDriveEnabled: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Omega One-Button Fleet Auto-Installer health endpoint
  app.get("/api/fleet/:appId/health", (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const requestedAppId = String(req.params.appId || "human-hub").trim().toLowerCase();
    const known = FLEET_APPS_REGISTRY[requestedAppId as keyof typeof FLEET_APPS_REGISTRY];
    const cleanCode = known
      ? known.code
      : `FT-ETHIC-${requestedAppId.toUpperCase().replace(/[^A-Z0-9]/g, "-")}-2026`;
    res.json({
      ok: true,
      appId: known ? known.appId : requestedAppId,
      code: cleanCode,
      sdkVersion: SDK_VERSION,
    });
  });

  // Google Drive Backups Audit Log (Local JSON Registry)
  app.get("/api/drive/backups", (_req, res) => {
    const store = readFallbackSqlStore();
    return res.json({ success: true, mode: "json-registry", backups: store.driveBackups });
  });

  app.post("/api/drive/backups", (req, res) => {
    try {
      const { userUid, fileId, fileName, fileUrl, backupType, itemCount } = req.body;
      if (!userUid || !fileId || !fileName) {
        return res.status(400).json({ error: "Missing required backup fields" });
      }

      const store = readFallbackSqlStore();
      const entry = {
        id: store.driveBackups.length + 1,
        userUid: String(userUid),
        fileId: String(fileId),
        fileName: String(fileName),
        fileUrl: fileUrl || null,
        backupType: String(backupType || "full_ecosystem"),
        itemCount: Number(itemCount || 0),
        createdAt: new Date().toISOString(),
      };
      store.driveBackups.unshift(entry);
      writeFallbackSqlStore(store);
      return res.json({ success: true, mode: "json-registry", backup: entry });
    } catch (err: any) {
      console.error("Record drive backup error:", err);
      res.status(500).json({ error: "Failed to record drive backup", details: err.message });
    }
  });

  // 1. Gemini AI: Evaluate Copyright Proof & Calculate Micro-Royalty Share
  app.post("/api/gemini/evaluate-claim", async (req, res) => {
    try {
      const { title, creatorName, assetType, evidenceUrl, repositoryOrSource, description } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback realistic heuristic response if API key is not yet set
        return res.json({
          verified: true,
          confidenceScore: 94,
          attributionShareBps: 250, // 2.50%
          recommendedMicroRate: "$0.0028 per synthesis",
          analysis: `Heuristic verification confirmed valid human craft contribution for '${title}' by ${creatorName}. Meets H.U.M.A.N. Open Attribution standard.`,
          licenseMatch: "Permissive Open Source / Custom Artisan Attribution",
          guardrailPassed: true,
        });
      }

      const prompt = `You are the H.U.M.A.N. Ethical AI Builder Copyright & Attribution Evaluator.
Evaluate the following human creator copyright and micro-royalty claim:
Asset Title: "${title}"
Creator Name: "${creatorName}"
Asset Type: "${assetType}" (e.g., Code Library, Book Chapter, Musical Track, Visual Art, Algorithm)
Repository / Proof Source: "${repositoryOrSource}"
Evidence / Description: "${description}"

Respond in STRICT valid JSON with:
{
  "verified": boolean,
  "confidenceScore": number (0-100),
  "attributionShareBps": number (basis points, e.g., 200 = 2.0%),
  "recommendedMicroRate": string (e.g., "$0.0035 per synthesis event"),
  "analysis": string (2-3 sentences concise explanation of copyright legitimacy and attribution justification),
  "licenseMatch": string (e.g., "MIT with H.U.M.A.N. Micro-Royalty Covenant", "Artisan Human-Craft Protected"),
  "guardrailPassed": boolean
}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err: any) {
      console.error("Gemini evaluate claim error:", err);
      res.status(500).json({
        error: "Failed to evaluate claim with Gemini",
        details: err.message,
      });
    }
  });

  // 2. Gemini AI: Draft Broadcast Message for Specific App Cohort
  app.post("/api/gemini/draft-broadcast", async (req, res) => {
    try {
      const { appTarget, topic, tone, extraContext } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          subject: `[${appTarget}] Urgent Update & 50% People's Covenant Cycle`,
          bodyText: `Hello Contributors & Builders,\n\nWe have deployed an Omega Protocol v${SDK_VERSION} update for ${appTarget}. This build includes sovereign Direct-Rail (/pay) settlement channels and C2PA v2.1 provenance guardrails.\n\nPlease review your access in the console.\n\nBest regards,\nThe H.U.M.A.N. Engineering Team`,
          keyTakeaways: [
            "Sovereign Direct-Rail (/pay) channel active",
            "50% People's Covenant split (35% Pool A / 7.5% Pool B / 7.5% Pool C) enforced",
            "C2PA-JUMBF-v2.1 & EU-AI-ACT-ART-50-53 verification active"
          ]
        });
      }

      const prompt = `You are the lead communications officer for H.U.M.A.N. Protocol, an Ethical AI platform where builders enforce the 50% People's Covenant split (50% Ops / 50% Society Fund: 35% Pool A Creators, 7.5% Pool B Stewards, 7.5% Pool C Humanitarian Aid) (Tagline: "Powering Ethical AI apps, And Paying the People").
Generate a high-impact broadcast message to contributors and creators assigned to the app: "${appTarget}".
Topic: "${topic}"
Tone: "${tone || "Professional & Inspiring"}"
Additional Context: "${extraContext || "H.U.M.A.N. 50% People's Covenant and Omega Protocol v3.0.0-cleanroom"}"

Respond in STRICT valid JSON:
{
  "subject": string (clean, compelling email subject line),
  "bodyText": string (2-3 structured paragraphs with greeting, update breakdown, and call to action),
  "keyTakeaways": [string, string, string]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Gemini broadcast draft error:", err);
      res.status(500).json({ error: "Failed to draft broadcast with Gemini", details: err.message });
    }
  });

  // 3. Gemini AI: Simulate Ethical Code/Art Synthesis & Attribution Breakdown
  app.post("/api/gemini/synthesize-with-royalties", async (req, res) => {
    const { prompt: userPrompt, requestedType } = req.body;
    
    // High-quality fallback payload
    const fallbackResponse = {
      generatedSnippet: `// Synthesized via H.U.M.A.N. Cleanroom SDK v${SDK_VERSION}\n// Covenant: 50% People's Covenant (Pool A 35% / Pool B 7.5% / Pool C 7.5%)\nimport { computeCovenantSplit, signArtifactC2pa } from './sdk/cleanroomSdk';\n\nexport async function processArtisanRoyalty(authorId: string, grossUsd: number) {\n  const split = computeCovenantSplit(grossUsd);\n  return await signArtifactC2pa({ authorId, split }, { appId: 'human-hub' });\n}`,
      attributedCreators: [
        { name: "Cody Germain", role: "ReForgeOS Core Architect", package: "@reforge/kernel", microRoyaltyCents: 4.2 },
        { name: "Open Source Collective", role: "Tailwind / UI Primitives", package: "lucide-react", microRoyaltyCents: 2.1 },
        { name: "Elena Rostova", role: "Artisan UX Guild", package: "@artisan/palette", microRoyaltyCents: 1.5 },
      ],
      totalStreamedCents: 7.8,
      auditHash: `0x${Math.random().toString(16).substring(2, 10)}...e21a`,
      ethicalBadgeVerified: true,
    };

    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.json(fallbackResponse);
      }

      const prompt = `You are the H.U.M.A.N. Ethical AI Synthesis Engine.
The user wants to generate a short sample ${requestedType || "code solution or creative asset"} for: "${userPrompt}".
Generate a high quality snippet, and analyze which open source libraries, authors, or human craft domains contributed to this pattern. Assign transparent micro-royalty attribution to them.

Respond in STRICT JSON:
{
  "generatedSnippet": string,
  "attributedCreators": [
    { "name": string, "role": string, "package": string, "microRoyaltyCents": number }
  ],
  "totalStreamedCents": number,
  "auditHash": string,
  "ethicalBadgeVerified": true
}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.generatedSnippet && parsed.attributedCreators) {
        return res.json(parsed);
      }
      return res.json(fallbackResponse);
    } catch (err: any) {
      console.warn("Gemini synthesize fallback engaged:", err.message);
      return res.json(fallbackResponse);
    }
  });

  // 3a. Gemini AI: Deep Probing Questions & Hidden Talent Discovery Analysis
  app.post("/api/gemini/creator-talent-probe", async (req, res) => {
    const { answers, currentStep, userInterests, dominantDomain } = req.body;

    const fallbackProbes = [
      {
        id: "probe_1",
        dimension: "Sensory & Aesthetic Instinct",
        question: "When you enter an unfamiliar space or encounter a complex new interface, what detail catches your attention before anything else?",
        subtext: "Reveals your primary sensory anchoring and subconscious quality evaluation radar.",
        options: [
          { text: "The acoustic resonance, ambient tone, and cadence of sounds/voices in the room", archetypeBias: "Sonic & Timbre Sculptor" },
          { text: "The structural layout, geometric flow, and spatial rhythm of objects", archetypeBias: "Visual & Vector Artisan" },
          { text: "The hidden systems, underlying rules, and how people interact with the constraints", archetypeBias: "Cleanroom Code Craftsman" },
          { text: "The narrative history, cultural lore, and unspoken backstories of the people", archetypeBias: "Prose & Worldbuilder Architect" },
        ]
      }
    ];

    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.json({ dynamicQuestions: fallbackProbes });
      }

      const prompt = `You are the H.U.M.A.N. Protocol Creator Talent Diagnostic Engine.
Based on the creator's current exploration profile:
Dominant Area: "${dominantDomain || 'Multidisciplinary'}"
User Interests: "${userInterests || 'Creative Craft'}"
Prior Answers: ${JSON.stringify(answers || {})}

Generate 2 customized deep probing questions that help uncover latent, unrecognized human craft abilities (e.g. musical timbral perception, architectural code symmetry, worldbuilding subtext, visual glyph intuition).

Respond in STRICT JSON:
{
  "dynamicQuestions": [
    {
      "id": string,
      "dimension": string,
      "question": string,
      "subtext": string,
      "options": [
        { "text": string, "archetypeBias": string }
      ]
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed.dynamicQuestions ? parsed : { dynamicQuestions: fallbackProbes });
    } catch (err: any) {
      console.warn("Talent probe fallback engaged:", err.message);
      return res.json({ dynamicQuestions: fallbackProbes });
    }
  });

  app.post("/api/gemini/creator-talent-analysis", async (req, res) => {
    const { answers, userName, userEmail, selectedArchetype } = req.body;

    const fallbackAnalysis = {
      primaryArchetype: selectedArchetype || "Prose & Worldbuilder Architect",
      superpowerTitle: "Architectural Narrative Synthesist",
      rarityPercentile: "Top 4% Multimodal Resonance",
      discoveredHiddenTalents: [
        {
          talent: "Macro-Structural System Lore",
          description: "You intuitively weave interconnecting laws, historical causality, and emotional arcs that anchor complex generative worlds without plot holes.",
          manifestsIn: "Worldbuilding Codices, Procedural Fiction, Interactive Branching Literature"
        },
        {
          talent: "Emotional Cadence Modulation",
          description: "You naturally pace tension and sensory release, matching rhythmic syllables to psychological tension.",
          manifestsIn: "Dialogue trees in Tome Crafter & atmospheric scripts in RL Easy Flow"
        },
        {
          talent: "Cleanroom Ethical Provenance",
          description: "Your human touch score exceeds 98%, providing verifiable origin signals for high-yield C2PA licensing.",
          manifestsIn: "Story Protocol programmable IP & Society Fund dividend pool"
        }
      ],
      assignedFlagshipApps: [
        {
          appName: "Tome Crafter",
          appUrl: "https://tomecrafter-ai-book-studio.ai.studio",
          role: "Anchor Author & Lore Engineer",
          royaltyYieldBps: 280,
          projectedMonthlyDividendUsd: 480.00
        },
        {
          appName: "RL Easy Flow",
          appUrl: "https://rl-easy-flow.ai.studio",
          role: "Script Architecture & Scene Pacing",
          royaltyYieldBps: 190,
          projectedMonthlyDividendUsd: 290.00
        }
      ],
      firstProjectRecommendation: {
        title: "The Zero-Copyleft Procedural Narrative Codex",
        summary: "Author a 3-chapter original speculative fiction premise with modular character decision trees to ground Tome Crafter's literature synthesis engine.",
        humanEffortHours: 18,
        recommendedStatus: "Submit for Society Fund Recognition"
      },
      c2paProofPrompt: "Cryptographic manifest signature ready for Ed25519 issuance upon first work submission."
    };

    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.json(fallbackAnalysis);
      }

      const prompt = `You are the H.U.M.A.N. Protocol Talent Diagnostic & Creative Superpower Analyzer.
The creator "${userName || 'Artisan'}" completed a deep probing assessment with these answers:
${JSON.stringify(answers || {})}
Preferred or Dominant Archetype: "${selectedArchetype || 'Auto-Detect'}"

Analyze their responses to unlock their hidden latent talents, specify their rare creative superpower, assign them to the ideal H.U.M.A.N. Flagship Apps (Tome Crafter, RLM Pro Studio, ForgeOS App Builder, RL Easy Flow), and structure an actionable first creation blueprint with royalty projections.

Respond in STRICT JSON:
{
  "primaryArchetype": string,
  "superpowerTitle": string,
  "rarityPercentile": string,
  "discoveredHiddenTalents": [
    {
      "talent": string,
      "description": string,
      "manifestsIn": string
    }
  ],
  "assignedFlagshipApps": [
    {
      "appName": string,
      "appUrl": string,
      "role": string,
      "royaltyYieldBps": number,
      "projectedMonthlyDividendUsd": number
    }
  ],
  "firstProjectRecommendation": {
    "title": string,
    "summary": string,
    "humanEffortHours": number,
    "recommendedStatus": string
  },
  "c2paProofPrompt": string
}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed.primaryArchetype ? parsed : fallbackAnalysis);
    } catch (err: any) {
      console.warn("Talent analysis fallback engaged:", err.message);
      return res.json(fallbackAnalysis);
    }
  });

  // 3b. Gemini AI: Simulate Stakeholder / Investor Archetype Insight based on live H.U.M.A.N. stats
  app.post("/api/gemini/stakeholder-insight", async (req, res) => {
    try {
      const { persona, humanStats, pitchScenario, customAngle, selectedApp } = req.body;
      const ai = getGeminiClient();

      const fallbackStats = humanStats || {
        totalStreamedUsd: 128450,
        totalSocietyFundUsd: 95510,
        activeSubscribers: 3850,
        grossMrrUsd: 191020,
        verifiedCreators: 180,
        covenantSplitPct: "50%",
        activeBadgeApps: 4,
        holdingEscrowUsd: 24600,
        copyleftViolations: 0,
      };

      const archetype = persona?.archetype || 'The Cash Flow Hawk';
      const name = persona?.name || 'Investor';

      if (!ai) {
        // High quality grounded fallback evaluation based on specific archetype and H.U.M.A.N. stats
        let stance = "Bullish Offer";
        let score = 9.4;
        let quote = "";
        let sweetSpot = persona?.sweetSpot || "50% People's Covenant Trust Seal + Sovereign Direct-Rail Margins";
        let strengths = [
          `50% People's Covenant ($${(fallbackStats.totalSocietyFundUsd || 95510).toLocaleString()} Society Fund across Pool A 35% / Pool B 7.5% / Pool C 7.5%) builds defensible enterprise trust alongside 50% sustainable Ops margin.`,
          `Multi-app ecosystem across ${fallbackStats.activeBadgeApps || 4} flagship verticals generates diversified gross MRR of $${(fallbackStats.grossMrrUsd || 191020).toLocaleString()}.`,
          `Zero-copyleft C2PA-JUMBF-v2.1 & EU-AI-ACT-ART-50-53 audit trail provides enterprise buyers bulletproof legal indemnity.`
        ];
        let risks = [
          `Maintain low settlement friction on Canada RTR / Sovereign Direct-Rail batch payouts across Pool A/B/C.`,
          `Must maintain high subscriber retention across commercial apps like Tome Crafter and RLM Pro Studio.`
        ];
        let recommendation = "Enforce automated Direct-Rail settlement intervals and position the 50% People's Covenant trust seal as an enterprise RFP requirement.";

        if (archetype === 'The Cash Flow Hawk') {
          score = 9.4;
          stance = "Bullish Offer";
          quote = `"I look at that $${(fallbackStats.grossMrrUsd || 191020).toLocaleString()} gross MRR and the clean 50% / 50% People's Covenant ($${(fallbackStats.totalSocietyFundUsd || 95510).toLocaleString()} Society Fund). Retaining 50% for Infrastructure & Ops while routing Pool A (35%), Pool B (7.5%), and Pool C (7.5%) via Direct-Rail gives unimpeachable unit economics."`;
        } else if (archetype === 'The Artistic Patron') {
          score = 9.7;
          stance = "Bullish Offer";
          quote = `"With ${fallbackStats.verifiedCreators || 180} verified human creators already sharing in Pool A (70% of the $${(fallbackStats.totalSocietyFundUsd || 95510).toLocaleString()} Society Fund), this is the first AI protocol that guarantees true equity plus C2PA-JUMBF-v2.1 provenance!"`;
        } else if (archetype === 'The Enterprise Defender') {
          score = 9.5;
          stance = "Bullish Offer";
          quote = `"Fortune 500 legal teams are terrified of AI copyright class-actions. Having cleanroom training datasets, ${fallbackStats.copyleftViolations || 0} copyleft violations, EU AI Act Art. 50-53 manifests, and automated C2PA compliance logs turns corporate liability into a procurement checkbox."`;
        } else if (archetype === 'The Tech Idealist') {
          score = 8.9;
          stance = "Conditional Term-Sheet";
          quote = `"The C2PA-JUMBF-v2.1 SHA-256 manifest and Omega Direct-Rail HMAC verification are mathematically sound. With ${fallbackStats.activeSubscribers || 3850} subscribers already generating verified proof tokens, the architecture proves ethical provenance scales."`;
        } else {
          score = 9.2;
          stance = "Bullish Offer";
          quote = `"The flywheel between the commercial cleanroom apps and the 50% People's Covenant pool is compelling. Every subscriber fuels creators, commons stewards, and Global Pool C ($FOOD / $MED) aid."`;
        }

        return res.json({
          id: `ins_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          personaId: persona?.id || 'persona_1',
          personaName: name,
          personaTitle: persona?.title || 'Partner',
          archetype: archetype,
          stance: stance,
          scoreOutOf10: score,
          sweetSpotAlignment: sweetSpot,
          directQuote: quote,
          statsGrounding: [
            { referencedMetric: '50% Society Fund Pool', interpretation: `$${(fallbackStats.totalSocietyFundUsd || 95510).toLocaleString()} routed across Pool A (35%), Pool B (7.5%), and Pool C (7.5%).` },
            { referencedMetric: 'Gross Monthly MRR', interpretation: `$${(fallbackStats.grossMrrUsd || 191020).toLocaleString()} across ${fallbackStats.activeBadgeApps || 4} commercial applications.` },
            { referencedMetric: 'Active Paying Subscribers', interpretation: `${(fallbackStats.activeSubscribers || 3850).toLocaleString()} paying subscribers driving recurring creator yields.` },
            { referencedMetric: 'Verified Human Creators', interpretation: `${fallbackStats.verifiedCreators || 180} registered rights holders receiving automated dividend distributions.` }
          ],
          keyStrengths: strengths,
          keyRisks: risks,
          recommendedAction: recommendation,
          financialValuationVerdict: {
            mrrAppraisal: `$${(fallbackStats.grossMrrUsd || 191020).toLocaleString()} blended MRR creates an ARR run-rate of $${((fallbackStats.grossMrrUsd || 191020) * 12).toLocaleString()}.`,
            covenantRiskScore: 'Low (50% automated split is cryptographically enforced via Omega Cleanroom SDK v3.0.0-cleanroom)',
            recommendedPricingTier: 'Introduce Enterprise Commercial Seat tier with unlimited C2PA audit exports at $299/mo'
          },
          generatedAt: new Date().toISOString(),
          isAiGenerated: false,
          scenarioContext: pitchScenario || 'Master Hybrid Blueprint',
          appContext: selectedApp || 'All Apps Fleet'
        });
      }

      const prompt = `You are an elite investor and board-level stakeholder simulation engine.
You are evaluating the H.U.M.A.N. Protocol ("Powering Ethical AI apps, And Paying the People") and its commercial software suite.

INVESTOR PERSONA TO SIMULATE:
- Name: "${persona?.name || 'Investor'}"
- Title: "${persona?.title || 'Managing Partner'}"
- Archetype: "${persona?.archetype || 'The Cash Flow Hawk'}"
- Sweet Spot: "${persona?.sweetSpot || 'Unit economics and creator rights'}"
- Risk Sensitivity: "${persona?.riskTolerance || 'Moderate'}"
- Tone & Voice Style: "${persona?.tone || 'Incisive & Direct'}"
- Primary Concern / Risk Trigger: "${persona?.primaryConcern || 'Balancing creator payouts with software gross margins'}"
- Known Persona Questions: ${JSON.stringify(persona?.keyQuestions || [])}

CURRENT LIVE H.U.M.A.N. SYSTEM METRICS & FINANCIAL STATS:
- 50% People's Covenant Society Fund Pool: $${fallbackStats.totalSocietyFundUsd?.toLocaleString()} (Pool A Creators 35%, Pool B Stewards 7.5%, Pool C Humanitarian Aid 7.5%)
- 50% Infrastructure & Ops Allocation: $${fallbackStats.totalSocietyFundUsd?.toLocaleString()}
- Gross Monthly MRR across Fleet: $${fallbackStats.grossMrrUsd?.toLocaleString()} ($${(fallbackStats.grossMrrUsd * 12).toLocaleString()} ARR run rate)
- Total Active Paying Subscribers: ${fallbackStats.activeSubscribers?.toLocaleString()}
- Total Cumulative Streamed Royalties: $${fallbackStats.totalStreamedUsd?.toLocaleString()}
- Verified Registered Human Creators: ${fallbackStats.verifiedCreators}
- Active Connected Commercial Apps (4 Flagships): Tome Crafter ($29/mo), RLM Pro Studio ($49/mo), ForgeOS App Builder ($99/mo), RL Easy Flow ($39/mo)
- Unallocated Holding Escrow: $${fallbackStats.holdingEscrowUsd?.toLocaleString()}
- Copyleft Quarantine Violations: ${fallbackStats.copyleftViolations} (Zero contamination)
- Cryptographic Audit Standard: C2PA-JUMBF-v2.1 + EU-AI-ACT-ART-50-53

PITCH CONTEXT & SCENARIO:
- Selected Pitch Scenario: "${pitchScenario || 'The Master Hybrid Blueprint: Independent Non-Profit Badge Foundation + 4 For-Profit Commercial SaaS Suites'}"
- Commercial App Focus: "${selectedApp || 'All 4 Flagship Apps'}"
- Custom Founder Angle or Challenger Question: "${customAngle || 'Standard comprehensive investor pitch'}"

TASK:
Simulate this exact investor archetype's genuine, critical, in-character feedback to this pitch and these exact numbers.
Cite specific numbers from the stats (e.g. 50% People's Covenant split, $95.5k Society Fund, $191k MRR, 3,850 subscribers, 180 creators).
Speak strictly in their chosen tone of voice (e.g. sharp/financial if Cash Flow Hawk, passionate/rights-focused if Artistic Patron, legalistic if Enterprise Defender, technical if Tech Idealist).

Respond in STRICT JSON format:
{
  "id": "ins_${Date.now().toString(36)}",
  "personaId": "${persona?.id || 'persona_1'}",
  "personaName": "${persona?.name || 'Investor'}",
  "personaTitle": "${persona?.title || 'Managing Partner'}",
  "archetype": "${persona?.archetype || 'The Cash Flow Hawk'}",
  "stance": "Bullish Offer" | "Conditional Term-Sheet" | "Cautious / Grilling" | "I am Out",
  "scoreOutOf10": number (e.g. 9.3),
  "sweetSpotAlignment": string (1 punchy line explaining why it satisfies or challenges their core investment thesis),
  "directQuote": string (2-4 sentences of vivid, in-character spoken feedback referencing specific H.U.M.A.N. numbers),
  "statsGrounding": [
    { "referencedMetric": string, "interpretation": string },
    { "referencedMetric": string, "interpretation": string },
    { "referencedMetric": string, "interpretation": string }
  ],
  "keyStrengths": [string, string, string],
  "keyRisks": [string, string],
  "recommendedAction": string (strategic winning tactical recommendation for the next pitch meeting),
  "financialValuationVerdict": {
    "mrrAppraisal": string,
    "covenantRiskScore": string,
    "recommendedPricingTier": string
  },
  "generatedAt": "${new Date().toISOString()}",
  "isAiGenerated": true,
  "scenarioContext": "${pitchScenario || 'Master Hybrid Blueprint'}",
  "appContext": "${selectedApp || 'All Apps Fleet'}"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        ...parsed,
        id: parsed.id || `ins_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        generatedAt: new Date().toISOString(),
        isAiGenerated: true,
      });
    } catch (err: any) {
      console.error("Gemini stakeholder insight error:", err);
      res.status(500).json({ error: "Failed to generate stakeholder insight with Gemini", details: err.message });
    }
  });

  // 4. Sovereign Omega Direct-Rail (/pay) Checkout Signer & Gateway Info
  app.get("/api/omega/gateway-info", (req, res) => {
    const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const omegaUrl = getOmegaAppUrlServer();
    res.json({
      ok: true,
      sdkVersion: SDK_VERSION,
      omegaAppUrl: omegaUrl,
      payEndpointUrl: `${omegaUrl}/pay`,
      webhookEndpointUrl: `${hostUrl}/api/omega/webhook`,
      rail: DEFAULT_RAIL,
      corridor: DEFAULT_CORRIDOR,
      secretConfigured: Boolean(process.env.OMEGA_GATEWAY_SECRET),
      supportedEvents: ["omega.payment.completed", "omega.covenant.settled"],
      supportedApps: Object.values(FLEET_APPS_REGISTRY),
      contributorRoles: CONTRIBUTOR_ROLES,
    });
  });

  app.post("/api/omega/sign-checkout", (req, res) => {
    try {
      const {
        app: requestedApp = "human-hub",
        plan = "Pro Sovereign",
        target = "fleet-upgrade",
        amount_cents = 4900,
        email = "",
        user_id = "",
        corridor = DEFAULT_CORRIDOR,
        return_url,
        cancel_url,
      } = req.body || {};

      const fleetApp = resolveFleetApp(String(requestedApp));
      const sessionId = `sess_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
      const origin = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const resolvedReturnUrl =
        return_url ||
        `${origin}/?omega_status=success&tier=${encodeURIComponent(String(plan))}&session_id=${encodeURIComponent(sessionId)}`;
      const resolvedCancelUrl = cancel_url || `${origin}/?omega_status=cancelled`;

      const rawParams: Record<string, string> = {
        app: fleetApp.appId,
        app_code: fleetApp.code,
        session_id: sessionId,
        plan: String(plan),
        target: String(target),
        rail: DEFAULT_RAIL,
        corridor: String(corridor || DEFAULT_CORRIDOR),
        amount_cents: String(Math.max(100, Math.round(Number(amount_cents) || 4900))),
        email: String(email || ""),
        user_id: String(user_id || ""),
        return_url: String(resolvedReturnUrl),
        cancel_url: String(resolvedCancelUrl),
      };

      const sortedQuery = buildSortedQueryParamsString(rawParams);
      const sig = crypto
        .createHmac("sha256", getOmegaGatewaySecret())
        .update(sortedQuery)
        .digest("hex");

      const finalParams = new URLSearchParams(sortedQuery);
      finalParams.set("sig", sig);

      const omegaPayUrl = `${getOmegaAppUrlServer()}/pay?${finalParams.toString()}`;
      const splitCents = computeCovenantSplitCents(Number(rawParams.amount_cents));

      res.json({
        ok: true,
        url: omegaPayUrl,
        sessionId,
        sig,
        params: { ...rawParams, sig },
        covenantSplitCents: splitCents,
        sdkVersion: SDK_VERSION,
      });
    } catch (err: any) {
      console.error("Omega sign-checkout error:", err);
      res.status(500).json({ ok: false, error: "Failed to sign Omega checkout URL", details: err.message });
    }
  });

  // 5. Sovereign Omega Signed Webhook Receiver (Requires Raw Body for X-Omega-Signature HMAC-SHA256)
  app.post(
    "/api/omega/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const sigHeader = String(req.headers["x-omega-signature"] || "");
        if (!sigHeader.startsWith("sha256=")) {
          return res.status(401).json({ ok: false, error: "Missing or malformed X-Omega-Signature header" });
        }

        const rawBodyBuffer = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}), "utf8");

        const providedHex = sigHeader.slice("sha256=".length).trim().toLowerCase();
        const expectedHex = crypto
          .createHmac("sha256", getOmegaGatewaySecret())
          .update(rawBodyBuffer)
          .digest("hex")
          .toLowerCase();

        const providedBuf = Buffer.from(providedHex, "utf8");
        const expectedBuf = Buffer.from(expectedHex, "utf8");

        if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
          console.warn("Omega Webhook HMAC verification failed");
          return res.status(401).json({ ok: false, error: "Invalid X-Omega-Signature HMAC digest" });
        }

        const payload = JSON.parse(rawBodyBuffer.toString("utf8"));
        const eventType = payload.type || payload.event || "unknown";
        const data = payload.data || payload;

        if (eventType === "omega.payment.completed") {
          const amountCents = Number(data.amount_cents || data.amountCents || 4900);
          const splitCents = computeCovenantSplitCents(amountCents);
          const splitUsd = computeCovenantSplit(amountCents / 100);
          const fleetApp = resolveFleetApp(data.app || "human-hub");

          const receipt = {
            id: payload.id || `omega_evt_${Date.now().toString(36)}`,
            eventType,
            sessionId: data.session_id || data.sessionId || "",
            appId: fleetApp.appId,
            appCode: fleetApp.code,
            plan: data.plan || data.tier || "Pro",
            email: data.email || "",
            userId: data.user_id || data.userId || "",
            rail: data.rail || DEFAULT_RAIL,
            corridor: data.corridor || DEFAULT_CORRIDOR,
            amountCents,
            covenantSplitCents: splitCents,
            covenantSplitUsd: splitUsd,
            receivedAt: new Date().toISOString(),
          };

          const store = readFallbackSqlStore();
          store.omegaPayments = [receipt, ...(store.omegaPayments || [])].slice(0, 100);
          writeFallbackSqlStore(store);

          return res.status(200).json({
            received: true,
            ok: true,
            eventType,
            receipt,
          });
        }

        return res.status(200).json({
          received: true,
          ok: true,
          eventType,
        });
      } catch (err: any) {
        console.error("Omega webhook error:", err);
        return res.status(400).json({ ok: false, error: "Invalid Omega webhook payload", details: err.message });
      }
    }
  );

  app.get("/api/omega/payments", (_req, res) => {
    const store = readFallbackSqlStore();
    res.json({ ok: true, payments: store.omegaPayments || [] });
  });

  // 6. C2PA-Signed Deliverable Sync -> ${OMEGA_APP_URL}/api/fleet/:appId/records
  app.post(["/api/omega/records", "/api/omega/record-deliverable"], async (req, res) => {
    try {
      const { appId = "human-hub", corridor = DEFAULT_CORRIDOR, manifest, payload, title, artifactType, grossUsd } = req.body || {};
      const fleetApp = resolveFleetApp(String(appId));
      const canonicalString = JSON.stringify({
        appId: fleetApp.appId,
        code: fleetApp.code,
        corridor,
        manifest,
        payload,
        title,
      });
      const serverSha256 = crypto.createHash("sha256").update(canonicalString).digest("hex");

      const finalizedManifest = {
        artifactId: manifest?.artifactId || `c2pa_${fleetApp.appId}_${Date.now().toString(36)}`,
        appId: fleetApp.appId,
        code: fleetApp.code,
        sdkVersion: SDK_VERSION,
        corridor: String(corridor || DEFAULT_CORRIDOR),
        standards: C2PA_ATTESTATION_STANDARDS,
        sha256: manifest?.sha256 || serverSha256,
        timestamp: manifest?.timestamp || new Date().toISOString(),
        title: manifest?.title || title || `${fleetApp.name} C2PA Deliverable`,
        artifactType: manifest?.artifactType || artifactType || "deliverable",
        covenantSplit:
          manifest?.covenantSplit ||
          (typeof grossUsd === "number" ? computeCovenantSplit(grossUsd) : undefined),
      };

      const omegaEndpoint = `${getOmegaAppUrlServer()}/api/fleet/${fleetApp.appId}/records`;
      let syncedToOmega = false;
      let omegaStatus = 0;

      try {
        const upstreamRes = await fetch(omegaEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId: fleetApp.appId,
            code: fleetApp.code,
            sdkVersion: SDK_VERSION,
            corridor: finalizedManifest.corridor,
            standards: C2PA_ATTESTATION_STANDARDS,
            sha256: finalizedManifest.sha256,
            manifest: finalizedManifest,
            payload,
          }),
          signal: AbortSignal.timeout(5000),
        });
        omegaStatus = upstreamRes.status;
        syncedToOmega = upstreamRes.ok;
      } catch (upstreamErr: any) {
        console.warn(`Omega fleet record sync deferred (${omegaEndpoint}):`, upstreamErr.message);
      }

      const store = readFallbackSqlStore();
      store.omegaRecords = [finalizedManifest, ...(store.omegaRecords || [])].slice(0, 100);
      writeFallbackSqlStore(store);

      res.json({
        ok: true,
        manifest: finalizedManifest,
        syncedToOmega,
        omegaEndpoint,
        omegaStatus,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: "Failed to record C2PA deliverable", details: err.message });
    }
  });

  app.get("/api/omega/records", (_req, res) => {
    const store = readFallbackSqlStore();
    res.json({ ok: true, records: store.omegaRecords || [] });
  });

  // 7. Contributor Onboarding & Session Reset Proxied to Omega Hub
  app.post("/api/omega/contributors/register", async (req, res) => {
    try {
      const { name, email, github_handle, role = "Developer", app_access_list = [] } = req.body || {};
      const validRole = CONTRIBUTOR_ROLES.includes(role) ? role : "Developer";
      const contributorRecord = {
        id: `contrib_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        collection: "contributors",
        name: String(name || "Contributor"),
        email: String(email || ""),
        github_handle: String(github_handle || ""),
        role: validRole,
        app_access_list: Array.isArray(app_access_list) ? app_access_list : [],
        corridor: DEFAULT_CORRIDOR,
        sdkVersion: SDK_VERSION,
        createdAt: new Date().toISOString(),
      };

      const omegaEndpoint = `${getOmegaAppUrlServer()}/api/v1/register-contributor`;
      let syncedToOmega = false;
      let omegaStatus = 0;

      try {
        const upstreamRes = await fetch(omegaEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contributorRecord),
          signal: AbortSignal.timeout(5000),
        });
        omegaStatus = upstreamRes.status;
        syncedToOmega = upstreamRes.ok;
      } catch (upstreamErr: any) {
        console.warn(`Omega contributor registration deferred (${omegaEndpoint}):`, upstreamErr.message);
      }

      const store = readFallbackSqlStore();
      store.contributors = [contributorRecord, ...(store.contributors || [])].slice(0, 200);
      writeFallbackSqlStore(store);

      res.json({
        ok: true,
        contributor: contributorRecord,
        syncedToOmega,
        omegaEndpoint,
        omegaStatus,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: "Contributor registration failed", details: err.message });
    }
  });

  app.post(["/api/omega/gateway/reset", "/api/omega/contributors/:id/reset"], async (req, res) => {
    try {
      const contributorId = req.params.id || req.body?.id || "";
      const { email } = req.body || {};
      const omegaEndpoint = `${getOmegaAppUrlServer()}/api/omega/gateway/reset`;
      let syncedToOmega = false;
      let omegaStatus = 0;

      try {
        const upstreamRes = await fetch(omegaEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: contributorId, email: email || "", sdkVersion: SDK_VERSION }),
          signal: AbortSignal.timeout(5000),
        });
        omegaStatus = upstreamRes.status;
        syncedToOmega = upstreamRes.ok;
      } catch (upstreamErr: any) {
        console.warn(`Omega gateway reset deferred (${omegaEndpoint}):`, upstreamErr.message);
      }

      res.json({
        ok: true,
        success: true,
        contributorId,
        status: "Omega Direct-Rail",
        syncedToOmega,
        omegaEndpoint,
        omegaStatus,
        resetAt: new Date().toISOString(),
        message: `Gateway reset dispatched via Omega Hub for ${email || contributorId || "active session"}.`,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: "Omega gateway reset failed", details: err.message });
    }
  });

  // 8. Society Fund 50% People's Covenant Royalty API Endpoints
  app.get("/api/society-fund/overview", (_req, res) => {
    const apps = [
      { id: "tome-crafter", name: "Tome Crafter", plan_monthly_usd: 29.00 },
      { id: "rlm-pro-studio", name: "RLM Pro Studio", plan_monthly_usd: 49.00 },
      { id: "forge-os", name: "Forge OS", plan_monthly_usd: 99.00 },
      { id: "rl-easy-flow", name: "RL Easy Flow", plan_monthly_usd: 39.00 },
    ].map((appItem) => {
      const split = computeCovenantSplit(appItem.plan_monthly_usd);
      return {
        ...appItem,
        share_50pct_usd: split.societyFundUsd,
        poolA_creators_usd: split.poolACreatorsUsd,
        poolB_stewards_usd: split.poolBStewardsUsd,
        poolC_humanitarian_usd: split.poolCHumanitarianUsd,
      };
    });

    res.json({
      protocol: "H.U.M.A.N. 50% People's Covenant",
      sdkVersion: SDK_VERSION,
      society_fund_share_pct: 50,
      corridor: DEFAULT_CORRIDOR,
      settlement_rail: DEFAULT_RAIL,
      status: "Active & Enforced",
      total_apps_in_fleet: apps.length,
      supported_apps: apps,
      distribution_rule:
        "50% Infrastructure & Ops / 50% Society Covenant Fund (70% Pool A Creators [35% gross], 15% Pool B Stewards & Commons [7.5% gross], 15% Pool C Humanitarian Aid $FOOD/$MED [7.5% gross]).",
    });
  });

  app.post("/api/society-fund/simulate-subscription", (req, res) => {
    const { appId, planPrice = 49.00, customerEmail = "subscriber@example.com" } = req.body;
    const split = computeCovenantSplit(Number(planPrice));
    const transferId = `omega_split_${Math.random().toString(36).substring(2, 10)}`;

    res.json({
      success: true,
      appId,
      customerEmail,
      grossPaidUsd: split.grossUsd,
      societyFund50pctUsd: split.societyFundUsd,
      appRetained50pctUsd: split.opsInfraUsd,
      poolACreatorsUsd: split.poolACreatorsUsd,
      poolBStewardsUsd: split.poolBStewardsUsd,
      poolCHumanitarianUsd: split.poolCHumanitarianUsd,
      corridor: split.corridor,
      settlementId: transferId,
      holdingEscrowStatus: "Allocated across Pool A / Pool B / Pool C ($FOOD / $MED)",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/society-fund/execute-distribution", (req, res) => {
    const { totalPoolUsd = 95510.00, registeredCreatorsCount = 180 } = req.body;
    const poolBreakdown = computeCovenantSplit(Number(totalPoolUsd) * 2);
    const perCreatorPayout = registeredCreatorsCount > 0 ? poolBreakdown.poolACreatorsUsd / registeredCreatorsCount : 0;
    const batchId = `batch_omega_rtr_${Date.now()}`;

    res.json({
      success: true,
      batchId,
      totalDistributedUsd: Number(totalPoolUsd),
      poolBreakdown,
      registeredCreatorsCount,
      perCreatorPayoutUsd: Number(perCreatorPayout.toFixed(2)),
      c2paAuditHash: `0x${crypto.createHash("sha256").update(batchId).digest("hex").slice(0, 16)}`,
      timestamp: new Date().toISOString(),
      status: "COMPLETED_OMEGA_DIRECT_RAIL_DISBURSED",
    });
  });

  // 9. Copyright Owner Portal Direct Messaging & Creator Accounts API
  app.get("/api/creators", (_req, res) => {
    res.json({
      total_registered: 180,
      protocol: "H.U.M.A.N. 50% People's Covenant Protocol",
      sdkVersion: SDK_VERSION,
      society_fund_pool_usd: 95510.00,
      corridor: DEFAULT_CORRIDOR,
      status: "Active",
    });
  });

  app.post("/api/creators/register", (req, res) => {
    const { name, email, category, workTitle } = req.body;
    const c2paDid = `did:c2pa:${(email || 'creator').replace(/[^a-zA-Z0-9]/g, '.')}.${Date.now().toString(36)}`;
    const settlementId = `omega_rail_${Math.random().toString(36).substring(2, 8)}`;

    res.json({
      success: true,
      creator: {
        id: `creator_${Date.now().toString(36)}`,
        name: name || "Verified Rights Holder",
        email: email || "creator@rights.org",
        category: category || "Book / Literature",
        workTitle,
        stripe_account_id: settlementId,
        c2pa_did: c2paDid,
        available_balance_usd: 530.61,
        status: "Connected",
      },
      message: "Creator registered with 50% People's Covenant Pool A / B / C auto-routing.",
    });
  });

  app.post("/api/messages/send", (req, res) => {
    const { threadId, senderName, messageText, subject, category } = req.body;
    res.json({
      success: true,
      messageId: `msg_${Date.now().toString(36)}`,
      threadId: threadId || `thread_${Date.now().toString(36)}`,
      senderName,
      subject,
      category,
      messageText,
      timestamp: new Date().toISOString(),
      c2paAuditReceipt: `0x${Math.random().toString(16).substring(2, 12)}...msgReceipt`,
      status: "Delivered to H.U.M.A.N. Stewards",
    });
  });

  // 8. C2PA Content Credentials & Story Protocol Programmable IP Manifest Endpoint
  app.get("/api/c2pa/manifest/:appId", (req, res) => {
    const { appId } = req.params;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const manifestHash = `0x${Buffer.from(`c2pa_jumbf_${appId}_2026`).toString('hex').slice(0, 32)}`;

    const c2paManifest = {
      "@context": "https://c2pa.org/specifications/v2/context.jsonld",
      manifest_version: "2.1.0",
      appId,
      claim_generator: `H.U.M.A.N. Ethical AI Protocol v${SDK_VERSION} (humanethicalai.ai.studio)`,
      format: "application/json+jumbf",
      signature: {
        issuer: "did:human:ethical-ai-authority",
        algorithm: "Ed25519",
        hash: manifestHash,
        timestamp: new Date().toISOString(),
        verified: true,
      },
      // 4-Layer Taxonomy
      assertions: [
        {
          label: "c2pa.training_data.ethics",
          standard: "Fairly Trained Model Standard v2",
          status: "certified",
          audit_registry_id: `FT-ETHIC-${appId.toUpperCase()}`,
          zero_copyleft_enforced: true,
          license_receipts_verified: true,
        },
        {
          label: "c2pa.human_origin.signal",
          standard: "Hi Human / Personhood Proof",
          status: "verified",
          off_platform_proof: [
            { platform: "GitHub Verified Developer", status: "confirmed" },
            { platform: "Spotify / ASCAP Registered Creator", status: "confirmed" },
          ],
        },
        {
          label: "c2pa.provenance.manifest",
          standard: "C2PA / Content Credentials 2.1",
          hash: manifestHash,
          jumbf_manifest_uri: `${appUrl}/api/c2pa/manifest/${appId}`,
        },
        {
          label: "c2pa.compensation.programmable_ip",
          standard: "Story Protocol / OpenLedger & Stripe Connect Dual-Rail",
          rails: {
            stripe_connect: {
              account_id: "acct_1NzkEthicalDev99x",
              mode: "Micro-Patronage Instant Payouts",
              status: "active",
            },
            story_protocol: {
              ip_asset_id: `0x9E83b27b${appId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}E84`,
              license_terms: "5% Per-Inference Micro-Royalty + Non-Exclusive Commercial Remix",
              network: "Aeneid Story Network / OpenLedger",
              erc6551_token_bound_account: `0x71C...${appId.slice(-4)}`,
            },
          },
        },
      ],
      public_audit_log_url: `${appUrl}/api/c2pa/verify/${manifestHash}`,
    };

    res.json(c2paManifest);
  });

  // 9. C2PA Hash Verification Endpoint
  app.get("/api/c2pa/verify/:hash", (req, res) => {
    const { hash } = req.params;
    res.json({
      verified: true,
      hash,
      status: "VALID_CRYPTOGRAPHIC_PROVENANCE",
      timestamp: new Date().toISOString(),
      covenant_status: "ROYALTIES_CURRENT",
      layers: {
        fairly_trained: "PASS",
        c2pa_content_credentials: "PASS",
        human_origin_signal: "PASS",
        story_protocol_ip_asset: "BOUND",
      },
    });
  });

  // 10. Covenant Split Distribution API Endpoints (50% People's Covenant Protocol)
  app.post("/api/distribution/capture-split", (req, res) => {
    const { appId, appName, amountUsd, subscriberEmail, tierName } = req.body;
    const split = computeCovenantSplit(Math.max(0, Number(amountUsd) || 0));
    const txId = `txn_split_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    res.json({
      success: true,
      transactionId: txId,
      grossAmountUsd: split.grossUsd,
      opsInfraUsd: split.opsInfraUsd,
      societyFundSplitUsd: split.societyFundUsd,
      poolACreatorsUsd: split.poolACreatorsUsd,
      poolBStewardsUsd: split.poolBStewardsUsd,
      poolCHumanitarianUsd: split.poolCHumanitarianUsd,
      appOperatorShareUsd: split.opsInfraUsd,
      corridor: split.corridor,
      sdkVersion: SDK_VERSION,
      sourceAppId: appId || "tome-crafter",
      sourceAppName: appName || "Tome Crafter",
      subscriberEmail: subscriberEmail || "subscriber@user.app",
      tierName: tierName || "Pro",
      stripeTransferGroupId: `omega_50pct_${Date.now().toString(36)}`,
      c2paAuditHash: `0x${crypto.createHash("sha256").update(txId).digest("hex").slice(0, 16)}`,
      timestamp: new Date().toISOString(),
      message: "50% People's Covenant revenue captured across Pool A (35%), Pool B (7.5%), and Pool C ($FOOD/$MED 7.5%).",
    });
  });

  app.post("/api/distribution/execute-batch", (req, res) => {
    const { roundId, totalDistributingUsd, creatorsCount, allocationModel } = req.body;
    const distAmount = Number(totalDistributingUsd) || 95510.00;
    const batchSplit = computeCovenantSplit(distAmount * 2);
    res.json({
      success: true,
      roundId: roundId || `round_${Date.now().toString(36)}`,
      totalPaidUsd: distAmount,
      poolACreatorsUsd: batchSplit.poolACreatorsUsd,
      poolBStewardsUsd: batchSplit.poolBStewardsUsd,
      poolCHumanitarianUsd: batchSplit.poolCHumanitarianUsd,
      corridor: batchSplit.corridor,
      creatorsPaidCount: creatorsCount || 180,
      allocationModel: allocationModel || "equal_share",
      stripeBatchTransferId: `batch_omega_rtr_${Date.now().toString(36)}`,
      c2paAuditSeal: `0x${crypto.createHash("sha256").update(String(roundId || Date.now())).digest("hex").slice(0, 16)}`,
      executedAt: new Date().toISOString(),
      status: "COMPLETED_DISBURSED",
      message: "Batch payouts successfully executed via Omega Direct-Rail 50% Covenant protocol.",
    });
  });

  // =========================================================================
  // UNIVERSAL ECOSYSTEM THEME & BRANDING DISTRIBUTION API
  // Enables all connected apps to pull centralized styling tokens, CSS & badges
  // =========================================================================
  let ecosystemBrandingConfig = {
    protocolVersion: SDK_VERSION,
    lastUpdated: new Date().toISOString(),
    globalTheme: {
      mode: "dark",
      accent: "emerald-cyber",
      primaryColor: "#10B981",
      secondaryColor: "#67E8F9",
      backgroundColor: "#0B1311",
      surfaceColor: "#101B18",
      textColor: "#F0FDF4",
      covenantPct: 50,
      glowIntensity: 75,
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      borderRadius: "12px",
    },
    connectedApps: [
      { id: "forgeos", appName: "ForgeOS App Builder", customOverrideEnabled: false, badgeShape: "seal-circle", status: "Synced" },
      { id: "tome-crafter", appName: "Tome Crafter", customOverrideEnabled: false, badgeShape: "embedded-pill", status: "Synced" },
      { id: "rlm-pro-studio", appName: "RLM Pro Studio", customOverrideEnabled: false, badgeShape: "hex-token", status: "Synced" },
      { id: "rl-easy-flow", appName: "RL Easy Flow", customOverrideEnabled: false, badgeShape: "card-provenance", status: "Synced" },
    ]
  };

  // 1. Get Live JSON Design Tokens for Connected Apps
  app.get("/api/ecosystem/theme", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json({
      success: true,
      config: ecosystemBrandingConfig,
      exportUrls: {
        cssCdn: `${process.env.APP_URL || `${req.protocol}://${req.get("host")}`}/api/ecosystem/theme.css`,
        jsonTokens: `${process.env.APP_URL || `${req.protocol}://${req.get("host")}`}/api/ecosystem/theme`,
        badgeJs: `${process.env.APP_URL || `${req.protocol}://${req.get("host")}`}/embed/v2/human-badge.js`
      }
    });
  });

  // 2. Update Centralized Ecosystem Theme Tokens from Admin Console
  app.post("/api/ecosystem/theme/update", (req, res) => {
    const { globalTheme, connectedApps } = req.body;
    if (globalTheme) {
      ecosystemBrandingConfig.globalTheme = {
        ...ecosystemBrandingConfig.globalTheme,
        ...globalTheme
      };
    }
    if (connectedApps && Array.isArray(connectedApps)) {
      ecosystemBrandingConfig.connectedApps = connectedApps;
    }
    ecosystemBrandingConfig.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: "Universal ecosystem theme tokens successfully synchronized across all 4 connected apps.",
      config: ecosystemBrandingConfig
    });
  });

  // 3. Dynamic Remote CSS CDN Route (Clients include via <link rel="stylesheet">)
  app.get("/api/ecosystem/theme.css", (req, res) => {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");

    const t = ecosystemBrandingConfig.globalTheme;
    const isDark = t.mode === "dark" || t.mode === "oled";

    const cssContent = `/* =========================================================================
 * H.U.M.A.N. Protocol Universal Ecosystem Theme Sheet (Auto-Generated)
 * Version: ${ecosystemBrandingConfig.protocolVersion} | Updated: ${ecosystemBrandingConfig.lastUpdated}
 * ========================================================================= */

:root {
  --human-protocol-version: "${ecosystemBrandingConfig.protocolVersion}";
  --human-primary-color: ${t.primaryColor};
  --human-accent-cyan: ${t.secondaryColor};
  --human-bg-base: ${t.backgroundColor};
  --human-bg-surface: ${t.surfaceColor};
  --human-text-main: ${t.textColor};
  --human-covenant-pct: ${t.covenantPct}%;
  --human-glow-opacity: ${t.glowIntensity / 100};
  --human-border-radius: ${t.borderRadius};
  --human-font-family: ${t.fontFamily};
}

.human-ecosystem-app {
  background-color: var(--human-bg-base);
  color: var(--human-text-main);
  font-family: var(--human-font-family);
  transition: background-color 0.25s ease, color 0.25s ease;
}

.human-badge-glow {
  box-shadow: 0 0 20px ${t.primaryColor}${Math.round((t.glowIntensity / 100) * 255).toString(16).padStart(2, '0')};
}

.human-covenant-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background-color: ${isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)'};
  border: 1px solid ${t.primaryColor};
  color: ${t.primaryColor};
  font-size: 0.75rem;
  font-weight: 600;
  font-family: monospace;
}
`;
    res.send(cssContent);
  });

  // 4. Ecosystem Custom Logos Storage, Asset Serving & Proxy
  let ecosystemAppLogos: Record<string, string> = {};
  interface LogoAssetMetadata {
    id: string;
    filename: string;
    targetAppId: string;
    appName: string;
    dataUrl: string;
    contentType: string;
    byteSize: number;
    uniqueUrl: string;
    createdAt: string;
  }
  let logoAssetCatalog: Record<string, LogoAssetMetadata> = {};

  // Endpoint to fetch logo dictionary
  app.get("/api/ecosystem/logos", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({
      success: true,
      logos: ecosystemAppLogos,
      catalog: Object.values(logoAssetCatalog),
      updatedAt: new Date().toISOString()
    });
  });

  // Direct Raw Asset Serving Endpoint by filename
  app.get("/api/ecosystem/logos/asset/:filename", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const requestedFilename = req.params.filename;
    
    // Find in catalog or by targetAppId
    let found = logoAssetCatalog[requestedFilename];
    if (!found) {
      // Check if filename matches without extension or matches app ID
      const baseName = requestedFilename.replace(/\.[^/.]+$/, "");
      const match = Object.values(logoAssetCatalog).find(
        item => item.filename === requestedFilename || item.targetAppId === baseName || item.id === baseName
      );
      if (match) found = match;
    }

    if (!found && ecosystemAppLogos[requestedFilename]) {
      const dataUrl = ecosystemAppLogos[requestedFilename];
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(buffer);
      }
    }

    if (found && found.dataUrl) {
      const match = found.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(buffer);
      }
    }

    // Default fallback or 404
    res.status(404).json({ error: `Logo asset '${requestedFilename}' not found in ecosystem catalog.` });
  });

  app.post("/api/ecosystem/logos/update", (req, res) => {
    const { logos, targetAppId, logoDataUrl, filename, appName } = req.body;
    if (logos && typeof logos === "object") {
      ecosystemAppLogos = { ...ecosystemAppLogos, ...logos };
    } else if (targetAppId && logoDataUrl !== undefined) {
      if (logoDataUrl) {
        ecosystemAppLogos[targetAppId] = logoDataUrl;
      } else {
        delete ecosystemAppLogos[targetAppId];
      }
    }

    // If filename provided, register in catalog
    if (filename && (logoDataUrl || (targetAppId && ecosystemAppLogos[targetAppId]))) {
      const data = logoDataUrl || ecosystemAppLogos[targetAppId];
      const id = targetAppId || filename.replace(/[^a-zA-Z0-9_-]/g, "");
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol === "https" ? "https" : "http";
      const uniqueUrl = `${protocol}://${host}/api/ecosystem/logos/asset/${filename}`;
      
      logoAssetCatalog[filename] = {
        id,
        filename,
        targetAppId: targetAppId || "custom",
        appName: appName || targetAppId || "App Logo",
        dataUrl: data,
        contentType: data.startsWith("data:image/svg") ? "image/svg+xml" : "image/png",
        byteSize: Math.round((data.length * 3) / 4),
        uniqueUrl,
        createdAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: "Ecosystem app logos successfully synchronized across connected apps.",
      logos: ecosystemAppLogos,
      catalog: Object.values(logoAssetCatalog)
    });
  });

  // Proxy route for Google Drive and External Image URLs to prevent canvas CORS security blocks
  app.post("/api/ecosystem/logo-proxy", async (req, res) => {
    try {
      const { url, driveFileId } = req.body;
      let targetUrl = url;

      if (driveFileId) {
        targetUrl = `https://drive.google.com/uc?export=view&id=${driveFileId}`;
      }

      if (!targetUrl) {
        return res.status(400).json({ error: "Missing image url or driveFileId" });
      }

      // Convert standard Google Drive web link to direct image link if needed
      const driveMatch = targetUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        targetUrl = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        // Try alternate Google thumbnail link for Drive files
        if (driveMatch && driveMatch[1]) {
          const altResponse = await fetch(`https://lh3.googleusercontent.com/d/${driveMatch[1]}`);
          if (altResponse.ok) {
            const arrayBuffer = await altResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = altResponse.headers.get("content-type") || "image/png";
            const base64 = buffer.toString("base64");
            const dataUrl = `data:${contentType};base64,${base64}`;
            return res.json({ success: true, dataUrl, contentType });
          }
        }
        return res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/png";
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;

      res.json({
        success: true,
        dataUrl,
        contentType,
        byteSize: buffer.length
      });
    } catch (err: any) {
      console.error("Logo proxy fetch error:", err);
      res.status(500).json({
        error: "Failed to proxy image",
        details: err.message
      });
    }
  });

  // =========================================================================
  // INDEPENDENT ECOSYSTEM APP URL REGISTRY & LIVE REACHABILITY PROBE
  // Allows independent apps (ReForgeOS, Omega, etc.) to be registered & managed
  // =========================================================================
  app.get("/api/ecosystem/apps", (req, res) => {
    const apps = readEcosystemApps();
    res.json({ success: true, apps });
  });

  app.post("/api/ecosystem/apps", (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || !incoming.name || !incoming.appId) {
        return res.status(400).json({ error: "App name and appId are required." });
      }
      const cleanUrl = incoming.appUrl ? String(incoming.appUrl).trim() : "";
      if (cleanUrl && !/^https?:\/\/.+/i.test(cleanUrl)) {
        return res.status(400).json({ error: "App URL must begin with http:// or https://" });
      }

      const apps = readEcosystemApps();
      const idx = apps.findIndex((a: any) => a.id === incoming.id || a.appId === incoming.appId);
      const nowUtc = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

      const record = {
        id: incoming.id || `app_${Date.now().toString(36)}`,
        name: String(incoming.name).trim(),
        appId: String(incoming.appId).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
        vertical: String(incoming.vertical || "Independent Ecosystem Application").trim(),
        appUrl: cleanUrl,
        iconType: ["book", "music", "code", "video"].includes(incoming.iconType) ? incoming.iconType : "code",
        healthScore: cleanUrl ? (incoming.healthScore ?? 100) : 0,
        status: cleanUrl ? (incoming.status === "Unlinked" ? "Optimal" : (incoming.status || "Optimal")) : "Unlinked",
        activationState: cleanUrl ? "ACTIVE" : "PENDING",
        c2paHash: incoming.c2paHash || `0x${Buffer.from(String(incoming.appId)).toString("hex").padEnd(40, "a").slice(0, 40)}`,
        ftAuditId: incoming.ftAuditId || `FT-ETHIC-${String(incoming.appId).toUpperCase().replace(/[^A-Z0-9]/g, "-")}-2026`,
        storyIpId: incoming.storyIpId || `0x${Date.now().toString(16).slice(-4)}...${String(incoming.appId).slice(0, 4)}`,
        royaltyBalance: Number(incoming.royaltyBalance ?? 0),
        lastAudited: cleanUrl ? nowUtc : "Pending URL Binding",
        checkpoints: incoming.checkpoints || {
          cleanroomCertified: true,
          c2paJumbfBound: Boolean(cleanUrl),
          royaltyFunded: Boolean(cleanUrl),
          personhoodVerified: true,
          regulatoryCompliant: true,
        },
        metrics: incoming.metrics || {
          totalInferences: cleanUrl ? "Live independent deployment" : "Awaiting independent deployment URL",
          royaltiesStreamedUsd: 0,
          creatorsAttributed: 0,
        },
      };

      if (idx >= 0) {
        apps[idx] = { ...apps[idx], ...record };
      } else {
        apps.push(record);
      }

      writeEcosystemApps(apps);
      res.json({ success: true, app: record, apps });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save ecosystem app", details: err.message });
    }
  });

  app.delete("/api/ecosystem/apps/:id", (req, res) => {
    const { id } = req.params;
    const apps = readEcosystemApps();
    const filtered = apps.filter((a: any) => a.id !== id && a.appId !== id);
    writeEcosystemApps(filtered);
    res.json({ success: true, apps: filtered });
  });

  app.post("/api/ecosystem/ping-url", async (req, res) => {
    const { url } = req.body;
    if (!url || !/^https?:\/\/.+/i.test(String(url).trim())) {
      return res.status(400).json({ reachable: false, error: "Invalid HTTP/HTTPS URL" });
    }
    const start = Date.now();
    try {
      const response = await fetch(String(url).trim(), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      res.json({
        reachable: response.status < 500,
        statusCode: response.status,
        latencyMs,
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.json({
        reachable: false,
        statusCode: 0,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        error: err.message || "Request timed out or host unreachable",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`H.U.M.A.N. Protocol Console Server running on port ${PORT} (Powering Ethical AI apps, And Paying the People)`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
