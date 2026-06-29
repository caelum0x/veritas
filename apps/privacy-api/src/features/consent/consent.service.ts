// Consent service: orchestrates consent lifecycle via @veritas/consent and the consent-capture flow.

import { ok, err, isOk, type Result } from "@veritas/core";
import type { Clock, EventBus } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { makeConsent, type Consent } from "@veritas/consent";
import { runConsentCaptureFlow, type ConsentRepository } from "@veritas/flows-compliance";
import type {
  GrantConsentBody,
  DenyConsentBody,
  WithdrawConsentBody,
  ListConsentQuery,
  CaptureConsentBody,
} from "./consent.schema.js";

/** Dependency interface consumed by ConsentService — satisfied by the app's container Deps. */
export interface ConsentServiceDeps {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly eventBus: EventBus;
  readonly consentRepo: ConsentRepository;
}

export class ConsentService {
  constructor(private readonly deps: ConsentServiceDeps) {}

  async grant(body: GrantConsentBody): Promise<Result<Consent, Error>> {
    try {
      const now = this.deps.clock.nowIso();
      const consent = makeConsent(
        {
          userId: body.userId,
          purposeId: body.purposeId,
          termsVersion: body.termsVersion,
          status: "granted",
          ipAddress: body.ipAddress,
          userAgent: body.userAgent,
        },
        now,
      );
      await this.deps.consentRepo.save(consent);
      this.deps.logger.info("Consent granted", { consentId: consent.id, userId: body.userId, purposeId: body.purposeId });
      return ok(consent);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async deny(body: DenyConsentBody): Promise<Result<Consent, Error>> {
    try {
      const now = this.deps.clock.nowIso();
      const consent = makeConsent(
        {
          userId: body.userId,
          purposeId: body.purposeId,
          termsVersion: body.termsVersion,
          status: "denied",
          ipAddress: body.ipAddress,
          userAgent: body.userAgent,
        },
        now,
      );
      await this.deps.consentRepo.save(consent);
      this.deps.logger.info("Consent denied", { consentId: consent.id, userId: body.userId, purposeId: body.purposeId });
      return ok(consent);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async withdraw(body: WithdrawConsentBody): Promise<Result<Consent, Error>> {
    try {
      const records = await this.deps.consentRepo.findByUser(body.userId);
      const active = records.find(
        (c) => c.purposeId === body.purposeId && c.status === "granted",
      );
      if (!active) {
        return err(new Error(`No active consent for user ${body.userId} and purpose ${body.purposeId}`));
      }
      const now = this.deps.clock.nowIso();
      const withdrawn: Consent = { ...active, status: "withdrawn", withdrawnAt: now, updatedAt: now };
      await this.deps.consentRepo.save(withdrawn);
      this.deps.logger.info("Consent withdrawn", { consentId: withdrawn.id, userId: body.userId });
      return ok(withdrawn);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async list(query: ListConsentQuery): Promise<Result<readonly Consent[], Error>> {
    try {
      const records = await this.deps.consentRepo.findByUser(query.userId);
      const filtered = records.filter((c) => {
        if (query.purposeId !== undefined && c.purposeId !== query.purposeId) return false;
        if (query.status !== undefined && c.status !== query.status) return false;
        return true;
      });
      return ok(filtered);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async check(userId: string, purposeId: string): Promise<Result<readonly Consent[], Error>> {
    try {
      const records = await this.deps.consentRepo.findByUser(userId);
      const active = records.filter((c) => c.purposeId === purposeId && c.status === "granted");
      return ok(active);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async capture(body: CaptureConsentBody): Promise<Result<{ consent: Consent; isUpdate: boolean }, Error>> {
    const result = await runConsentCaptureFlow(
      {
        consentRepo: this.deps.consentRepo,
        eventBus: this.deps.eventBus,
        clock: this.deps.clock,
        logger: this.deps.logger,
      },
      {
        consent: {
          userId: body.userId,
          purposeId: body.purposeId,
          termsVersion: body.termsVersion,
          status: body.status,
          ipAddress: body.ipAddress,
          userAgent: body.userAgent,
        },
      },
    );
    if (!isOk(result)) return err(result.error as Error);
    this.deps.logger.info("Consent captured via flow", {
      consentId: result.value.consent.id,
      isUpdate: result.value.isUpdate,
    });
    return ok(result.value);
  }
}
