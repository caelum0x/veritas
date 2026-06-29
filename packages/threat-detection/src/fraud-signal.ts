// Fraud signal detection — identifies indicators of fraudulent activity.

import { z } from "zod";
import type { ThreatContext } from "./types.js";
import { computeRiskScore } from "./score.js";
import type { RiskScore } from "./types.js";

const FraudIndicatorSchema = z.object({
  label: z.string().min(1),
  weight: z.number().min(0).max(100),
  description: z.string().optional(),
});

export type FraudIndicator = z.infer<typeof FraudIndicatorSchema>;

export interface FraudSignalResult {
  readonly fraudDetected: boolean;
  readonly riskScore: RiskScore;
  readonly indicators: readonly FraudIndicator[];
}

const KNOWN_TOR_EXIT_PREFIXES = ["185.220.", "199.249.", "176.10."];
const DISPOSABLE_DOMAINS = ["mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com"];
const HIGH_RISK_GEOS = ["XX", "A1", "A2"]; // Maxmind anonymous proxy codes

function detectTorExit(ip: string): boolean {
  return KNOWN_TOR_EXIT_PREFIXES.some((p) => ip.startsWith(p));
}

function detectDisposableEmail(metadata: Record<string, unknown>): boolean {
  const email = metadata["email"];
  if (typeof email !== "string") return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_DOMAINS.includes(domain);
}

function detectHighRiskGeo(metadata: Record<string, unknown>): boolean {
  const geoCode = metadata["geoCode"];
  return typeof geoCode === "string" && HIGH_RISK_GEOS.includes(geoCode.toUpperCase());
}

function detectSuspiciousAmount(metadata: Record<string, unknown>): boolean {
  const amount = metadata["amount"];
  if (typeof amount !== "number") return false;
  return amount > 9_000 && amount < 10_001; // structuring pattern (just under reporting threshold)
}

function detectMultipleAccountsSameIp(metadata: Record<string, unknown>): boolean {
  const accountCount = metadata["accountsFromIp"];
  return typeof accountCount === "number" && accountCount > 3;
}

export function detectFraudSignals(ctx: ThreatContext): FraudSignalResult {
  const indicators: FraudIndicator[] = [];
  const meta = ctx.metadata ?? {};

  if (ctx.ip && detectTorExit(ctx.ip)) {
    indicators.push(Object.freeze({ label: "TOR_EXIT_NODE", weight: 60 }));
  }

  if (detectDisposableEmail(meta)) {
    indicators.push(Object.freeze({ label: "DISPOSABLE_EMAIL", weight: 45 }));
  }

  if (detectHighRiskGeo(meta)) {
    indicators.push(Object.freeze({ label: "HIGH_RISK_GEO", weight: 35 }));
  }

  if (detectSuspiciousAmount(meta)) {
    indicators.push(Object.freeze({ label: "STRUCTURING_AMOUNT", weight: 70 }));
  }

  if (detectMultipleAccountsSameIp(meta)) {
    indicators.push(Object.freeze({ label: "MULTI_ACCOUNT_SAME_IP", weight: 50 }));
  }

  const riskScore = computeRiskScore(indicators);
  return Object.freeze({
    fraudDetected: riskScore.value >= 30,
    riskScore,
    indicators: Object.freeze(indicators),
  });
}

export function parseFraudIndicator(raw: unknown): FraudIndicator {
  return FraudIndicatorSchema.parse(raw);
}
