// Consent-capture flow: validate consent input -> persist consent record -> emit event.
import { type Result, ok, err, tryAsync, type Clock, type EventBus, makeDomainEvent } from "@veritas/core";
import {
  type Consent,
  type CreateConsent,
  CreateConsentSchema,
  makeConsent,
} from "@veritas/consent";
import type { Logger } from "@veritas/observability";
import type { ConsentRepository } from "./deps.js";

export interface ConsentCaptureFlowDeps {
  readonly consentRepo: ConsentRepository;
  readonly eventBus: EventBus;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface ConsentCaptureInput {
  readonly consent: CreateConsent;
}

export interface ConsentCaptureOutput {
  readonly consent: Consent;
  readonly isUpdate: boolean;
}

export async function runConsentCaptureFlow(
  deps: ConsentCaptureFlowDeps,
  input: ConsentCaptureInput,
): Promise<Result<ConsentCaptureOutput>> {
  const { consentRepo, eventBus, clock, logger } = deps;

  // Step 1: Validate consent input
  const parseResult = CreateConsentSchema.safeParse(input.consent);
  if (!parseResult.success) {
    return err(new Error(`Invalid consent input: ${parseResult.error.message}`));
  }
  const validated = parseResult.data;

  // Step 2: Check for existing consent record (update vs new)
  const existingResult = await tryAsync(() =>
    consentRepo.findByUser(validated.userId),
  );
  if (!existingResult.ok) return err(existingResult.error);
  const isUpdate = existingResult.value.length > 0;

  // Step 3: Build the consent record
  const now = clock.nowIso();
  const consent = makeConsent(validated, now);
  logger.info("Consent record built", { consentId: consent.id, status: consent.status, isUpdate });

  // Step 4: Persist consent record
  const saveResult = await tryAsync(() => consentRepo.save(consent));
  if (!saveResult.ok) return err(saveResult.error);

  // Step 5: Emit domain event
  const event = makeDomainEvent({
    type: "consent.captured" as const,
    payload: {
      consentId: consent.id,
      userId: consent.userId,
      purposeId: consent.purposeId,
      status: consent.status,
      termsVersion: consent.termsVersion,
      isUpdate,
    },
  }, clock);
  const publishResult = await tryAsync(() => eventBus.publish(event));
  if (!publishResult.ok) {
    logger.warn("Failed to publish consent captured event", { consentId: consent.id });
  }

  return ok({ consent, isUpdate });
}
