// Crypto SpecializedVerifier: orchestrates on-chain tx, contract, token, and price sources to verify crypto claims.

import { ok, isOk, epochToIso, type Result } from "@veritas/core";
import {
  makeEvidenceBundle,
  requireSource,
  type SpecializedVerifier,
  type VerifiableClaim,
  type VerifierContext,
  type VerifierOutput,
  type DomainEvidence,
  type EvidenceStance,
} from "@veritas/verifier-kit";
import { canHandleCryptoClaim, extractEvmHashes, extractCryptoSymbols } from "./matcher.js";
import {
  makeCryptoEvidenceResult,
  type TxEvidence,
  type ContractEvidence,
  type TokenEvidence,
  type PriceEvidence,
} from "./evidence.js";
import { makeCryptoSignals } from "./signals.js";
import { buildCryptoAnalysisPrompt, CRYPTO_SYSTEM_PROMPT } from "./prompts.js";
import type { IsoTimestamp } from "@veritas/core";

const VERIFIER_ID = "veritas-crypto";

/** Infer evidence stance from snippet content relative to claim. */
function inferStance(snippet: string, claimText: string): EvidenceStance {
  const lower = snippet.toLowerCase();
  const claimLower = claimText.toLowerCase();
  const negTerms = /not|no |failed|revert|invalid|mismatch|incorrect|false|wrong/;
  const posTerms = /confirmed|success|verified|valid|correct|match|found|recorded/;
  const snippetNeg = negTerms.test(lower);
  const claimNeg = negTerms.test(claimLower);
  if (snippetNeg !== claimNeg) return "refutes";
  if (posTerms.test(lower)) return "supports";
  return "neutral";
}

/** Map a SourceDocument to a TxEvidence item. */
function toTxEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: string,
): TxEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "tx-lookup",
    excerpt: doc.snippet,
    relevanceScore: 0.8,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: (doc.publishedAt ?? null) as IsoTimestamp | null,
    retrievedAt: retrievedAt as IsoTimestamp,
    metadata: {
      txHash: String(doc.metadata["txHash"] ?? doc.id),
      chainId: Number(doc.metadata["chainId"] ?? 1),
      chainName: String(doc.metadata["chainName"] ?? "Ethereum"),
      from: String(doc.metadata["from"] ?? ""),
      to: doc.metadata["to"] != null ? String(doc.metadata["to"]) : null,
      valueEth: String(doc.metadata["valueEth"] ?? "0"),
      valueUsd: doc.metadata["valueUsd"] != null ? Number(doc.metadata["valueUsd"]) : undefined,
      blockNumber: Number(doc.metadata["blockNumber"] ?? 0),
      blockTimestamp: String(doc.metadata["blockTimestamp"] ?? retrievedAt) as IsoTimestamp,
      status: (doc.metadata["status"] as "success" | "reverted" | "pending") ?? "success",
      gasUsed: doc.metadata["gasUsed"] != null ? Number(doc.metadata["gasUsed"]) : undefined,
    },
  };
}

/** Map a SourceDocument to a ContractEvidence item. */
function toContractEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: string,
): ContractEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "contract-verify",
    excerpt: doc.snippet,
    relevanceScore: 0.75,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: (doc.publishedAt ?? null) as IsoTimestamp | null,
    retrievedAt: retrievedAt as IsoTimestamp,
    metadata: {
      address: String(doc.metadata["address"] ?? ""),
      chainId: Number(doc.metadata["chainId"] ?? 1),
      chainName: String(doc.metadata["chainName"] ?? "Ethereum"),
      isVerified: Boolean(doc.metadata["isVerified"] ?? false),
      contractName: doc.metadata["contractName"] != null ? String(doc.metadata["contractName"]) : undefined,
      compilerVersion: doc.metadata["compilerVersion"] != null ? String(doc.metadata["compilerVersion"]) : undefined,
      isProxy: doc.metadata["isProxy"] != null ? Boolean(doc.metadata["isProxy"]) : undefined,
      implementationAddress: doc.metadata["implementationAddress"] != null ? String(doc.metadata["implementationAddress"]) : undefined,
      deployedAt: (doc.metadata["deployedAt"] as IsoTimestamp | null) ?? null,
      deployer: doc.metadata["deployer"] != null ? String(doc.metadata["deployer"]) : undefined,
    },
  };
}

/** Map a SourceDocument to a TokenEvidence item. */
function toTokenEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: string,
): TokenEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "token-data",
    excerpt: doc.snippet,
    relevanceScore: 0.7,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: (doc.publishedAt ?? null) as IsoTimestamp | null,
    retrievedAt: retrievedAt as IsoTimestamp,
    metadata: {
      symbol: String(doc.metadata["symbol"] ?? ""),
      name: String(doc.metadata["name"] ?? ""),
      chainId: doc.metadata["chainId"] != null ? Number(doc.metadata["chainId"]) : undefined,
      contractAddress: doc.metadata["contractAddress"] != null ? String(doc.metadata["contractAddress"]) : undefined,
      marketCapUsd: doc.metadata["marketCapUsd"] != null ? Number(doc.metadata["marketCapUsd"]) : undefined,
      circulatingSupply: doc.metadata["circulatingSupply"] != null ? Number(doc.metadata["circulatingSupply"]) : undefined,
      totalSupply: doc.metadata["totalSupply"] != null ? Number(doc.metadata["totalSupply"]) : undefined,
      rank: doc.metadata["rank"] != null ? Number(doc.metadata["rank"]) : undefined,
      dataDate: String(doc.metadata["dataDate"] ?? retrievedAt) as IsoTimestamp,
    },
  };
}

/** Map a SourceDocument to a PriceEvidence item. */
function toPriceEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: string,
): PriceEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "price-feed",
    excerpt: doc.snippet,
    relevanceScore: 0.7,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: (doc.publishedAt ?? null) as IsoTimestamp | null,
    retrievedAt: retrievedAt as IsoTimestamp,
    metadata: {
      symbol: String(doc.metadata["symbol"] ?? ""),
      priceUsd: Number(doc.metadata["priceUsd"] ?? 0),
      priceChange24hPct: doc.metadata["priceChange24hPct"] != null ? Number(doc.metadata["priceChange24hPct"]) : undefined,
      volume24hUsd: doc.metadata["volume24hUsd"] != null ? Number(doc.metadata["volume24hUsd"]) : undefined,
      high24hUsd: doc.metadata["high24hUsd"] != null ? Number(doc.metadata["high24hUsd"]) : undefined,
      low24hUsd: doc.metadata["low24hUsd"] != null ? Number(doc.metadata["low24hUsd"]) : undefined,
      priceAt: String(doc.metadata["priceAt"] ?? retrievedAt) as IsoTimestamp,
      source: String(doc.metadata["source"] ?? "price-feed"),
    },
  };
}

/** Crypto SpecializedVerifier implementation. */
export class CryptoVerifier implements SpecializedVerifier {
  readonly id = VERIFIER_ID;
  readonly displayName = "Blockchain & Crypto Verifier";
  readonly domains: ReadonlyArray<string> = [
    "crypto", "blockchain", "defi", "nft", "web3", "on-chain", "onchain", "token", "cryptocurrency",
  ];

  canHandle(claim: VerifiableClaim): boolean {
    return canHandleCryptoClaim(claim);
  }

  async verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    const retrievedAt = epochToIso(ctx.clock.now());
    const evmHashes = extractEvmHashes(claim.text);
    const symbols = extractCryptoSymbols(claim.text);
    const keywords = [
      ...evmHashes.slice(0, 2),
      ...symbols,
      ...claim.text.split(/\s+/).slice(0, 6),
    ];

    const emptyDocs = ok([] as readonly import("@veritas/verifier-kit").SourceDocument[]);

    const [txResult, contractResult, tokenResult, priceResult] = await Promise.all([
      ctx.sources.has("tx-lookup")
        ? requireSource(ctx, "tx-lookup").search({ keywords, maxResults: 5 })
        : Promise.resolve(emptyDocs),
      ctx.sources.has("contract-verify")
        ? requireSource(ctx, "contract-verify").search({ keywords, maxResults: 5 })
        : Promise.resolve(emptyDocs),
      ctx.sources.has("token-data")
        ? requireSource(ctx, "token-data").search({ keywords, maxResults: 5 })
        : Promise.resolve(emptyDocs),
      ctx.sources.has("price-feed")
        ? requireSource(ctx, "price-feed").search({ keywords, maxResults: 5 })
        : Promise.resolve(emptyDocs),
    ]);

    const txDocs = isOk(txResult) ? txResult.value : [];
    const contractDocs = isOk(contractResult) ? contractResult.value : [];
    const tokenDocs = isOk(tokenResult) ? tokenResult.value : [];
    const priceDocs = isOk(priceResult) ? priceResult.value : [];

    const txEvidence = txDocs.map((d) => toTxEvidence(d, claim.text, retrievedAt));
    const contractEvidence = contractDocs.map((d) => toContractEvidence(d, claim.text, retrievedAt));
    const tokenEvidence = tokenDocs.map((d) => toTokenEvidence(d, claim.text, retrievedAt));
    const priceEvidence = priceDocs.map((d) => toPriceEvidence(d, claim.text, retrievedAt));

    const evidenceResult = makeCryptoEvidenceResult(
      claim.id,
      txEvidence,
      contractEvidence,
      tokenEvidence,
      priceEvidence,
    );

    const allEvidence: ReadonlyArray<DomainEvidence> = [
      ...txEvidence,
      ...contractEvidence,
      ...tokenEvidence,
      ...priceEvidence,
    ];

    const evidenceSummaries = allEvidence.slice(0, 8).map((e) => ({
      label: e.label,
      excerpt: e.excerpt,
      sourceUri: e.sourceUri,
    }));

    let llmRationale: string | null = null;
    if (allEvidence.length > 0) {
      try {
        const userPrompt = buildCryptoAnalysisPrompt(claim, evidenceSummaries);
        // Combine the system prompt and user prompt into the claim text for adjudication.
        const adjudicateText = `${CRYPTO_SYSTEM_PROMPT}\n\n${userPrompt}`;
        const llmResponse = await ctx.llm.adjudicate(adjudicateText, {
          maxOutputTokens: 512,
        });
        if (isOk(llmResponse)) {
          const adjudication = llmResponse.value as import("@veritas/llm").ClaimAdjudication;
          llmRationale = adjudication.explanation;
        }
      } catch {
        // LLM failure is non-fatal; signals still derive from evidence
      }
    }

    const signals = makeCryptoSignals(evidenceResult);
    const bundle = makeEvidenceBundle(VERIFIER_ID, claim.text, allEvidence, retrievedAt);

    const signalsWithLlm =
      llmRationale != null
        ? signals.map((s, i) =>
            i === 0
              ? { ...s, rationale: s.rationale + ` LLM adjudication: ${llmRationale!.slice(0, 200)}` }
              : s,
          )
        : signals;

    return ok({
      verifierId: VERIFIER_ID,
      evidence: bundle,
      signals: signalsWithLlm,
    });
  }
}

/** Singleton factory for the crypto verifier. */
export function createCryptoVerifier(): CryptoVerifier {
  return new CryptoVerifier();
}
