// Pre-built policy rules for fact-verification jobs (confidence gating, escalation, audit).
import { makeRule } from './rule.js';
import {
  and,
  fieldGte,
  fieldLt,
  fieldEq,
  fieldExists,
  always,
} from './condition.js';
import {
  allow,
  deny,
  flag,
  requireReview,
  escalate,
  auditLog,
  setField,
} from './action.js';
import type { Rule } from './rule.js';

/** Minimum confidence score required to auto-allow a verification result. */
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/** Confidence floor below which a result is auto-denied. */
const LOW_CONFIDENCE_THRESHOLD = 0.40;

/** Minimum number of corroborating sources for high-confidence auto-allow. */
const MIN_SOURCE_COUNT = 2;

/**
 * Auto-allow rule: high confidence + sufficient sources + no conflicting evidence.
 */
export const autoAllowRule: Rule = makeRule({
  id: 'verification/auto-allow',
  name: 'Auto Allow High Confidence',
  description: 'Allow verification results that meet confidence and source thresholds.',
  priority: 100,
  condition: and(
    fieldGte('confidenceScore', HIGH_CONFIDENCE_THRESHOLD),
    fieldGte('sourceCount', MIN_SOURCE_COUNT),
    fieldEq('hasConflictingEvidence', false),
  ),
  actions: [
    allow('Confidence and source thresholds met with no conflicting evidence.'),
    auditLog('verification.auto_allowed', { threshold: HIGH_CONFIDENCE_THRESHOLD }),
  ],
  enabled: true,
  tags: ['verification', 'auto-decision'],
});

/**
 * Auto-deny rule: confidence is critically low.
 */
export const autoDenyRule: Rule = makeRule({
  id: 'verification/auto-deny',
  name: 'Auto Deny Low Confidence',
  description: 'Deny verification results with critically low confidence.',
  priority: 90,
  condition: fieldLt('confidenceScore', LOW_CONFIDENCE_THRESHOLD),
  actions: [
    deny('Confidence score below minimum acceptable threshold.', 'LOW_CONFIDENCE'),
    flag('low-confidence', 'critical'),
    auditLog('verification.auto_denied', { threshold: LOW_CONFIDENCE_THRESHOLD }),
  ],
  enabled: true,
  tags: ['verification', 'auto-decision'],
});

/**
 * Conflicting evidence rule: flag and require human review.
 */
export const conflictingEvidenceRule: Rule = makeRule({
  id: 'verification/conflicting-evidence',
  name: 'Require Review on Conflicting Evidence',
  description: 'Flag results with conflicting evidence for mandatory analyst review.',
  priority: 80,
  condition: fieldEq('hasConflictingEvidence', true),
  actions: [
    requireReview('analyst', 'Conflicting evidence detected in source set.'),
    flag('conflicting-evidence', 'warning'),
    auditLog('verification.review_required', { reason: 'conflicting_evidence' }),
  ],
  enabled: true,
  tags: ['verification', 'review'],
});

/**
 * Insufficient sources rule: require review when source count is low.
 */
export const insufficientSourcesRule: Rule = makeRule({
  id: 'verification/insufficient-sources',
  name: 'Flag Insufficient Sources',
  description: 'Require review when fewer than the minimum number of sources are present.',
  priority: 70,
  condition: and(
    fieldLt('sourceCount', MIN_SOURCE_COUNT),
    fieldGte('confidenceScore', LOW_CONFIDENCE_THRESHOLD),
  ),
  actions: [
    requireReview('analyst', 'Insufficient corroborating sources.'),
    flag('insufficient-sources', 'warning'),
    setField('meta.reviewReason', 'insufficient_sources'),
  ],
  enabled: true,
  tags: ['verification', 'review'],
});

/**
 * Escalation rule: escalate if an override tier is explicitly set in facts.
 */
export const escalationOverrideRule: Rule = makeRule({
  id: 'verification/escalation-override',
  name: 'Escalation Tier Override',
  description: 'Escalate to a specified tier when the escalationTierOverride fact is present.',
  priority: 110,
  condition: fieldExists('escalationTierOverride'),
  actions: [
    escalate('escalationTierOverride', 'Explicit escalation override requested.'),
    auditLog('verification.escalated', { reason: 'override' }),
  ],
  enabled: true,
  tags: ['verification', 'escalation'],
});

/**
 * Audit all decisions: lowest priority catch-all that ensures every evaluation is logged.
 */
export const auditAllRule: Rule = makeRule({
  id: 'verification/audit-all',
  name: 'Audit All Verifications',
  description: 'Emit an audit log entry for every verification evaluation.',
  priority: 0,
  condition: always,
  actions: [
    auditLog('verification.evaluated', {}),
  ],
  enabled: true,
  tags: ['verification', 'audit'],
});

/** Default ordered set of verification rules (higher priority first). */
export const defaultVerificationRules: ReadonlyArray<Rule> = [
  escalationOverrideRule,
  autoAllowRule,
  autoDenyRule,
  conflictingEvidenceRule,
  insufficientSourcesRule,
  auditAllRule,
];
