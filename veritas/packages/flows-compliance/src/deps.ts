// Shared dependency port interfaces for flows-compliance: injected via constructor/params.

import type { Clock, Logger, EventBus } from "@veritas/core";
import type { DsrStore } from "@veritas/gdpr";
import type { PurgeExecutor } from "@veritas/retention";
import type { AuditExporter } from "@veritas/audit-export";
import type { SiemAdapter } from "@veritas/audit-export";
import type { AuditEvent } from "@veritas/audit-export";
import type { Consent, CreateConsent } from "@veritas/consent";

/** Port for reading and writing consent records. */
export interface ConsentRepository {
  save(consent: Consent): Promise<void>;
  findByUser(userId: string): Promise<readonly Consent[]>;
}

/** Port for sourcing audit events to export. */
export interface AuditEventSource {
  listEvents(filter?: {
    fromTimestamp?: string;
    toTimestamp?: string;
    limit?: number;
  }): Promise<readonly AuditEvent[]>;
}

/** Aggregate dependencies for all compliance flows. */
export interface ComplianceDeps {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly eventBus: EventBus;
  readonly dsrStore: DsrStore;
  readonly purgeExecutor: PurgeExecutor;
  readonly auditExporter: AuditExporter;
  readonly siemAdapter: SiemAdapter;
  readonly consentRepo: ConsentRepository;
  readonly auditEventSource: AuditEventSource;
}
