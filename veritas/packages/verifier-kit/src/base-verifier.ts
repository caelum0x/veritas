// BaseVerifier: shared helper base class for specialized verifier implementations.

import { ok, err, isOk, type Result } from "@veritas/core";
import { type VerifiableClaim, type VerifierOutput, type SpecializedVerifier } from "./specialized-verifier.js";
import { type VerifierContext, requireSource } from "./context.js";
import { type DataSourcePort } from "./source-port.js";
import { type VerdictSignal, makeVerdictSignal } from "./signal.js";
import { type DomainEvidence, makeEvidenceBundle } from "./evidence.js";
import { aggregateSignals } from "./aggregate-signals.js";
import { SourceUnavailableError } from "./errors.js";

/** Options passed to the BaseVerifier constructor. */
export interface BaseVerifierOptions {
  readonly id: string;
  readonly displayName: string;
  readonly domains: ReadonlyArray<string>;
  /** Names of required DataSourcePort entries in the VerifierContext. */
  readonly requiredSources?: ReadonlyArray<string>;
}

/**
 * Abstract base providing shared utilities for specialized verifiers.
 * Subclasses implement `canHandle` and `gatherEvidence`.
 */
export abstract class BaseVerifier implements SpecializedVerifier {
  readonly id: string;
  readonly displayName: string;
  readonly domains: ReadonlyArray<string>;
  protected readonly requiredSources: ReadonlyArray<string>;

  constructor(options: BaseVerifierOptions) {
    this.id = options.id;
    this.displayName = options.displayName;
    this.domains = options.domains;
    this.requiredSources = options.requiredSources ?? [];
  }

  /** Subclasses declare whether this verifier can handle a given claim. */
  abstract canHandle(claim: VerifiableClaim): boolean;

  /**
   * Subclasses gather domain evidence and return signals.
   * Called only after source availability is confirmed.
   */
  protected abstract gatherEvidence(
    claim: VerifiableClaim,
    ctx: VerifierContext,
    sources: ReadonlyMap<string, DataSourcePort>
  ): Promise<{ evidence: ReadonlyArray<DomainEvidence>; signals: ReadonlyArray<VerdictSignal> }>;

  /** Entrypoint: validates sources, gathers evidence, and builds the output. */
  async verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    // Confirm all required sources are registered.
    for (const name of this.requiredSources) {
      try {
        requireSource(ctx, name);
      } catch {
        return err(new SourceUnavailableError(name, `not registered in VerifierContext`));
      }
    }

    const availableSources: Map<string, DataSourcePort> = new Map();
    for (const name of this.requiredSources) {
      availableSources.set(name, requireSource(ctx, name));
    }

    try {
      const { evidence, signals } = await this.gatherEvidence(
        claim,
        ctx,
        availableSources as ReadonlyMap<string, DataSourcePort>
      );

      const bundle = makeEvidenceBundle(
        this.id,
        claim.text,
        evidence,
        ctx.clock.nowIso()
      );

      const output: VerifierOutput = {
        verifierId: this.id,
        evidence: bundle,
        signals,
      };

      return ok(output);
    } catch (thrown: unknown) {
      const cause = thrown instanceof Error ? thrown : new Error(String(thrown));
      return err(cause);
    }
  }

  /** Helper: build a VerdictSignal with this verifier's id pre-filled. */
  protected signal(
    params: Omit<VerdictSignal, "verifierId">
  ): VerdictSignal {
    return makeVerdictSignal({ ...params, verifierId: this.id });
  }

  /** Helper: aggregate a set of signals and return the dominant verdict. */
  protected aggregate(signals: ReadonlyArray<VerdictSignal>) {
    return aggregateSignals(signals);
  }

  /** Helper: safely search a named source, returning empty array on failure. */
  protected async safeSearch(
    source: DataSourcePort,
    query: Parameters<DataSourcePort["search"]>[0]
  ): Promise<ReadonlyArray<import("./source-port.js").SourceDocument>> {
    const result = await source.search(query);
    return isOk(result) ? result.value : [];
  }
}
