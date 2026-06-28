// Policy actions: effects to apply when a rule matches
export type ActionKind =
  | 'allow'
  | 'deny'
  | 'require_review'
  | 'flag'
  | 'set_field'
  | 'notify'
  | 'escalate'
  | 'audit_log';

export interface AllowAction {
  readonly kind: 'allow';
  readonly reason?: string;
}

export interface DenyAction {
  readonly kind: 'deny';
  readonly reason: string;
  readonly code?: string;
}

export interface RequireReviewAction {
  readonly kind: 'require_review';
  readonly reviewerRole?: string;
  readonly reason?: string;
}

export interface FlagAction {
  readonly kind: 'flag';
  readonly label: string;
  readonly severity: 'info' | 'warning' | 'critical';
}

export interface SetFieldAction {
  readonly kind: 'set_field';
  readonly field: string;
  readonly value: unknown;
}

export interface NotifyAction {
  readonly kind: 'notify';
  readonly channel: string;
  readonly message: string;
  readonly recipients?: ReadonlyArray<string>;
}

export interface EscalateAction {
  readonly kind: 'escalate';
  readonly tier: string;
  readonly reason?: string;
}

export interface AuditLogAction {
  readonly kind: 'audit_log';
  readonly event: string;
  readonly details?: Record<string, unknown>;
}

export type Action =
  | AllowAction
  | DenyAction
  | RequireReviewAction
  | FlagAction
  | SetFieldAction
  | NotifyAction
  | EscalateAction
  | AuditLogAction;

// Builders
export const allow = (reason?: string): AllowAction => ({ kind: 'allow', reason });
export const deny = (reason: string, code?: string): DenyAction => ({ kind: 'deny', reason, code });
export const requireReview = (reviewerRole?: string, reason?: string): RequireReviewAction => ({ kind: 'require_review', reviewerRole, reason });
export const flag = (label: string, severity: FlagAction['severity']): FlagAction => ({ kind: 'flag', label, severity });
export const setField = (field: string, value: unknown): SetFieldAction => ({ kind: 'set_field', field, value });
export const notify = (channel: string, message: string, recipients?: ReadonlyArray<string>): NotifyAction => ({ kind: 'notify', channel, message, recipients });
export const escalate = (tier: string, reason?: string): EscalateAction => ({ kind: 'escalate', tier, reason });
export const auditLog = (event: string, details?: Record<string, unknown>): AuditLogAction => ({ kind: 'audit_log', event, details });

export function isDenyAction(action: Action): action is DenyAction {
  return action.kind === 'deny';
}

export function isAllowAction(action: Action): action is AllowAction {
  return action.kind === 'allow';
}
