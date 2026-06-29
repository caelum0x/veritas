// Flow: classify claim domain via taxonomy, route to specialized verifiers, merge signals.
import { ok, err, isErr, isOk, systemClock, toAppError } from "@veritas/core";
import type { Result, AppError, Verdict } from "@veritas/core";
import { LLMClassifier, isDomain } from "@veritas/taxonomy";
import type { ClaimDomain } from "@veritas/verifier-kit";
import { makeVerifierContext, aggregateSignals } from "@veritas/verifier-kit";
import type {
  SpecializedVerifier,
  VerifiableClaim as SpecVerifiableClaim,
  VerifierOutput,
  VerdictSignal,
} from "@veritas/verifier-kit";
import type { DomainRoutedVerifyDeps } from "./deps.js";
import {
  makeVerificationFlowStarted,
  makeVerificationFlowFailed,
} from "./events.js";
import { FlowClassificationError, FlowRoutingError, FlowNoVerifierError } from "./errors.js";

export interface DomainRoutedVerifyInput {
  readonly claimId: string;
  readonly claimText: string;
  readonly domainHint?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface DomainRoutedVerifyOutput {
  readonly claimId: string;
  readonly domain: string;
  readonly verdict: Verdict;
  readonly confidence: number;
  readonly verifierIds: ReadonlyArray<string>;
  readonly outputs: ReadonlyArray<VerifierOutput>;
  readonly durationMs: number;
}

/**
 * Classify the claim domain, select verifiers, fan-out verify, then aggregate signals.
 */
export async function domainRoutedVerifyFlow(
  input: DomainRoutedVerifyInput,
  deps: DomainRoutedVerifyDeps,
): Promise<Result<DomainRoutedVerifyOutput, AppError>> {
  const { llm, classifierLlm, verifiers, dataSource, eventBus, logger } = deps;
  const startMs = Date.now();

  eventBus.publish(makeVerificationFlowStarted(input.claimText));

  // Step 1: Classify domain via LLM taxonomy classifier
  const classifier = new LLMClassifier(classifierLlm);
  const classifyResult = await classifier.classify(input.claimText, {
    domainHint: input.domainHint as never,
  });

  if (!isOk(classifyResult)) {
    eventBus.publish(makeVerificationFlowFailed(classifyResult.error.message));
    return err(
      new FlowClassificationError(classifyResult.error.message) as unknown as AppError,
    );
  }

  const classification = classifyResult.value;
  const domainStr = String(classification.domain);
  const claimDomain: ClaimDomain | undefined = isDomain(domainStr) ? (domainStr as ClaimDomain) : undefined;

  logger.info("domain-routed-verify: classified", {
    claimId: input.claimId,
    domain: domainStr,
    confidence: classification.confidence,
  });

  // Step 2: Find verifiers that can handle this domain/claim
  const claim: SpecVerifiableClaim = {
    id: input.claimId,
    text: input.claimText,
    submittedAt: new Date().toISOString() as SpecVerifiableClaim["submittedAt"],
    domain: claimDomain,
    metadata: input.metadata,
  };

  const eligible: SpecializedVerifier[] = verifiers.filter((v) => v.canHandle(claim));

  if (eligible.length === 0) {
    const msg = `No verifier for domain: ${domainStr}`;
    eventBus.publish(makeVerificationFlowFailed(msg));
    return err(new FlowNoVerifierError(domainStr) as unknown as AppError);
  }

  logger.info("domain-routed-verify: verifiers selected", {
    claimId: input.claimId,
    verifierIds: eligible.map((v) => v.id),
  });

  // Step 3: Build verifier context and fan-out
  const ctx = makeVerifierContext(
    llm,
    new Map([["default", dataSource]]),
    systemClock,
  );

  const settled = await Promise.allSettled(eligible.map((v) => v.verify(claim, ctx)));

  const outputs: VerifierOutput[] = [];
  const signals: VerdictSignal[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    if (result.status === "rejected") {
      logger.warn("domain-routed-verify: verifier threw", {
        verifierId: eligible[i]!.id,
        error: String(result.reason),
      });
      continue;
    }
    if (isErr(result.value)) {
      const verErr = toAppError(result.value.error);
      logger.warn("domain-routed-verify: verifier returned err", {
        verifierId: eligible[i]!.id,
        code: verErr.code,
      });
      continue;
    }
    const out = result.value.value;
    outputs.push(out);
    for (const signal of out.signals) {
      signals.push(signal);
    }
  }

  if (signals.length === 0) {
    const msg = `All verifiers for domain "${domainStr}" failed to produce signals`;
    eventBus.publish(makeVerificationFlowFailed(msg));
    return err(new FlowRoutingError(msg) as unknown as AppError);
  }

  // Step 4: Aggregate signals into a final verdict
  const aggregated = aggregateSignals(signals);
  const durationMs = Date.now() - startMs;

  logger.info("domain-routed-verify: complete", {
    claimId: input.claimId,
    domain: domainStr,
    verdict: aggregated.verdict,
    confidence: aggregated.confidence,
    durationMs,
  });

  return ok({
    claimId: input.claimId,
    domain: domainStr,
    verdict: aggregated.verdict,
    confidence: aggregated.confidence,
    verifierIds: eligible.map((v) => v.id),
    outputs,
    durationMs,
  });
}
