// Label sets for claim types and domains used across taxonomy classification.

import { ClaimType } from "./claim-type.js";
import { Domain } from "./domain.js";

/** Human-readable display labels for each claim type. */
export const CLAIM_TYPE_LABELS: Readonly<Record<ClaimType, string>> = {
  [ClaimType.Statistical]: "Statistical Claim",
  [ClaimType.Causal]: "Causal Claim",
  [ClaimType.Definitional]: "Definitional Claim",
  [ClaimType.Predictive]: "Predictive Claim",
  [ClaimType.Quote]: "Direct Quote",
  [ClaimType.Event]: "Event Claim",
  [ClaimType.Comparative]: "Comparative Claim",
} as const;

/** Short single-word labels for compact display. */
export const CLAIM_TYPE_SHORT_LABELS: Readonly<Record<ClaimType, string>> = {
  [ClaimType.Statistical]: "Statistical",
  [ClaimType.Causal]: "Causal",
  [ClaimType.Definitional]: "Definitional",
  [ClaimType.Predictive]: "Predictive",
  [ClaimType.Quote]: "Quote",
  [ClaimType.Event]: "Event",
  [ClaimType.Comparative]: "Comparative",
} as const;

/** Human-readable display labels for each domain. */
export const DOMAIN_LABELS: Readonly<Record<Domain, string>> = {
  [Domain.Financial]: "Financial",
  [Domain.Scientific]: "Scientific",
  [Domain.Medical]: "Medical",
  [Domain.News]: "News & Current Events",
  [Domain.Crypto]: "Cryptocurrency & Blockchain",
  [Domain.Legal]: "Legal",
  [Domain.General]: "General",
} as const;

/** Emoji icons for domains (for UI display). */
export const DOMAIN_ICONS: Readonly<Record<Domain, string>> = {
  [Domain.Financial]: "📈",
  [Domain.Scientific]: "🔬",
  [Domain.Medical]: "⚕️",
  [Domain.News]: "📰",
  [Domain.Crypto]: "₿",
  [Domain.Legal]: "⚖️",
  [Domain.General]: "🌐",
} as const;

/** Description strings for each claim type. */
export const CLAIM_TYPE_DESCRIPTIONS: Readonly<Record<ClaimType, string>> = {
  [ClaimType.Statistical]:
    "A claim involving numerical data, percentages, or quantitative measurements.",
  [ClaimType.Causal]:
    "A claim asserting that one thing causes, leads to, or produces another.",
  [ClaimType.Definitional]:
    "A claim that defines, describes, or characterizes what something is.",
  [ClaimType.Predictive]:
    "A claim about future events, trends, or outcomes.",
  [ClaimType.Quote]:
    "A claim attributing specific words or statements to a person or source.",
  [ClaimType.Event]:
    "A claim about something that happened or occurred at a specific time.",
  [ClaimType.Comparative]:
    "A claim comparing two or more entities, quantities, or qualities.",
} as const;

/** Description strings for each domain. */
export const DOMAIN_DESCRIPTIONS: Readonly<Record<Domain, string>> = {
  [Domain.Financial]:
    "Claims about markets, stocks, earnings, economic indicators, or financial instruments.",
  [Domain.Scientific]:
    "Claims from peer-reviewed research, experiments, or empirical studies.",
  [Domain.Medical]:
    "Claims about health, treatments, medications, diagnoses, or clinical outcomes.",
  [Domain.News]:
    "Claims about current events, political developments, or reported incidents.",
  [Domain.Crypto]:
    "Claims about blockchain networks, token prices, on-chain activity, or DeFi protocols.",
  [Domain.Legal]:
    "Claims about laws, regulations, court decisions, or legal obligations.",
  [Domain.General]:
    "Claims that do not fit into a specialized domain.",
} as const;

/** Ordered list of all claim types for iteration. */
export const ALL_CLAIM_TYPES: readonly ClaimType[] = [
  ClaimType.Statistical,
  ClaimType.Causal,
  ClaimType.Definitional,
  ClaimType.Predictive,
  ClaimType.Quote,
  ClaimType.Event,
  ClaimType.Comparative,
] as const;

/** Ordered list of all domains for iteration. */
export const ALL_DOMAINS: readonly Domain[] = [
  Domain.Financial,
  Domain.Scientific,
  Domain.Medical,
  Domain.News,
  Domain.Crypto,
  Domain.Legal,
  Domain.General,
] as const;
