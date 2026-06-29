// Reference implementation of VerifierPlugin — keyword-match heuristic verifier.
import { ok, err, type Result, contentHash, epochToIso, asScore, Verdict } from "@veritas/core";
import type { VerifierPlugin, PluginVerifyInput } from "./plugin.js";
import type { PluginManifest } from "./manifest.js";
import type { PluginContext } from "./context.js";
import type { PluginHooks, BeforeVerifyArgs, AfterVerifyArgs, OnErrorArgs } from "./hooks.js";
import { makePluginResult, type PluginResult } from "./result.js";

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

const MANIFEST: PluginManifest = {
  id: "com.veritas.example-keyword-verifier",
  name: "Example Keyword Verifier",
  version: "1.0.0",
  description: "Reference plugin that checks whether the claim contains trusted keywords.",
  author: "Veritas Platform",
  license: "MIT",
  capabilities: [],
  sandboxed: true,
  tags: ["example", "keyword", "reference"],
};

// ---------------------------------------------------------------------------
// Trusted keyword set (immutable)
// ---------------------------------------------------------------------------

const TRUSTED_KEYWORDS: ReadonlySet<string> = new Set([
  "verified",
  "confirmed",
  "peer-reviewed",
  "published",
  "official",
  "established",
  "documented",
]);

const MISLEADING_KEYWORDS: ReadonlySet<string> = new Set([
  "unverified",
  "rumor",
  "alleged",
  "speculation",
  "unconfirmed",
  "disputed",
]);

// ---------------------------------------------------------------------------
// Plugin implementation
// ---------------------------------------------------------------------------

/** Reference VerifierPlugin using keyword heuristics — not for production use. */
export class ExampleKeywordVerifierPlugin implements VerifierPlugin {
  readonly id = MANIFEST.id;
  readonly manifest = MANIFEST;

  private initialized = false;
  private activated = false;

  async initialize(ctx: PluginContext): Promise<Result<void>> {
    ctx.logger.info("ExampleKeywordVerifierPlugin initializing", { pluginId: this.id });
    this.initialized = true;
    return ok(undefined);
  }

  async activate(ctx: PluginContext): Promise<Result<void>> {
    if (!this.initialized) {
      return err(new Error("Plugin must be initialized before activation"));
    }
    ctx.logger.info("ExampleKeywordVerifierPlugin activated", { pluginId: this.id });
    this.activated = true;
    return ok(undefined);
  }

  async verify(
    input: PluginVerifyInput,
    ctx: PluginContext,
  ): Promise<Result<PluginResult>> {
    if (!this.activated) {
      return err(new Error("Plugin is not activated"));
    }

    const lower = input.claim.toLowerCase();
    const words = lower.split(/\s+/);

    const trustedMatches = words.filter((w) => TRUSTED_KEYWORDS.has(w));
    const misleadingMatches = words.filter((w) => MISLEADING_KEYWORDS.has(w));

    const rawScore =
      trustedMatches.length > 0
        ? Math.min(1, 0.5 + trustedMatches.length * 0.15 - misleadingMatches.length * 0.2)
        : Math.max(0, 0.4 - misleadingMatches.length * 0.15);

    const score = asScore(Math.max(0, Math.min(1, rawScore)));
    const verdict: Verdict =
      score >= 0.6 ? Verdict.SUPPORTED : score <= 0.3 ? Verdict.REFUTED : Verdict.UNVERIFIABLE;

    const inputHashVal = contentHash(input.claim);

    ctx.logger.debug("keyword verification complete", {
      pluginId: this.id,
      verdict,
      score,
      trustedMatches,
      misleadingMatches,
    });

    const result = makePluginResult({
      verdict,
      score,
      evidence: [
        {
          label: "Keyword heuristic analysis",
          sourceRef: input.sourceUrl ?? "urn:veritas:example-plugin:internal",
          excerpt: `Trusted keywords found: [${trustedMatches.join(", ")}]. Misleading keywords: [${misleadingMatches.join(", ")}].`,
          confidence: score,
        },
      ],
      provenance: {
        inputHash: inputHashVal,
        executedAt: epochToIso(Date.now()),
      },
      rationale: `Keyword heuristic: ${trustedMatches.length} trusted / ${misleadingMatches.length} misleading indicators → score ${score.toFixed(2)}`,
      meta: {
        trustedMatches,
        misleadingMatches,
        wordCount: words.length,
      },
    });

    return ok(result);
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.activated = false;
  }

  readonly hooks: Partial<PluginHooks> = {
    async beforeVerify(_args: BeforeVerifyArgs, ctx: PluginContext): Promise<Result<void>> {
      ctx.logger.debug("beforeVerify hook", { pluginId: MANIFEST.id });
      return ok(undefined);
    },

    async afterVerify(args: AfterVerifyArgs, ctx: PluginContext): Promise<void> {
      ctx.logger.debug("afterVerify hook", {
        pluginId: MANIFEST.id,
        verdict: args.result.verdict,
      });
    },

    async onError(args: OnErrorArgs, ctx: PluginContext): Promise<void> {
      ctx.logger.error("plugin error hook", {
        pluginId: MANIFEST.id,
        phase: args.phase,
        error: String(args.error),
      });
    },

    async beforeDispose(ctx: PluginContext): Promise<void> {
      ctx.logger.info("beforeDispose hook", { pluginId: MANIFEST.id });
    },
  };
}

/** Factory function returning a new ExampleKeywordVerifierPlugin instance. */
export function createExamplePlugin(): VerifierPlugin {
  return new ExampleKeywordVerifierPlugin();
}
