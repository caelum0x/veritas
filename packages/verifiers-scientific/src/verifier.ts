// ScientificVerifier: SpecializedVerifier implementation for peer-reviewed literature and scientific claims.

import { ok, isOk, type Result, type IsoTimestamp } from "@veritas/core";
import {
  type SpecializedVerifier,
  type SpecializedVerifiableClaim,
  type VerifierOutput,
  type VerifierContext,
  type DomainEvidence,
  type VerdictSignal,
  type EvidenceStance,
  makeEvidenceBundle,
} from "@veritas/verifier-kit";
import { Verdict, asScore } from "@veritas/core";
import { isScientificClaim, extractDoi, extractPmid, extractArxivId, extractSearchKeywords } from "./matcher.js";
import {
  makeScientificEvidenceResult,
  type PubMedEvidence,
  type CrossrefEvidence,
  type ArxivEvidence,
  type RetractionEvidence,
} from "./evidence.js";
import {
  peerReviewedSupportSignal,
  retractionRefuteSignal,
  preprintSupportSignal,
  noLiteratureSignal,
  conflictingLiteratureSignal,
} from "./signals.js";

const VERIFIER_ID = "verifiers-scientific";

/** ScientificVerifier checks claims against PubMed, Crossref, arXiv, and retraction databases. */
export class ScientificVerifier implements SpecializedVerifier {
  readonly id = VERIFIER_ID;
  readonly displayName = "Scientific Literature Verifier";
  readonly domains: ReadonlyArray<string> = ["scientific"];

  canHandle(claim: SpecializedVerifiableClaim): boolean {
    return isScientificClaim(claim);
  }

  async verify(claim: SpecializedVerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    const now = ctx.clock.nowIso();
    const doi = extractDoi(claim.text);
    const pmid = extractPmid(claim.text);
    const arxivId = extractArxivId(claim.text);
    const keywords = extractSearchKeywords(claim.text);

    const query = { keywords: [...keywords], maxResults: 5 };

    // Sources are optional: an unregistered port yields no documents rather than
    // crashing, so the verifier degrades gracefully when a data source has not
    // been configured.
    const searchSource = (
      name: string,
      domain?: string,
    ): Promise<Result<readonly import("@veritas/verifier-kit").SourceDocument[], Error>> => {
      const port = ctx.sources.get(name);
      if (port === undefined) return Promise.resolve(ok([]));
      return port.search({ ...query, domain });
    };

    const [pubmedResult, crossrefResult, arxivResult, retractionResult] = await Promise.all([
      searchSource("pubmed", pmid ?? undefined),
      searchSource("crossref", doi ?? undefined),
      searchSource("arxiv", arxivId ?? undefined),
      searchSource("retraction"),
    ]);

    const pubmedDocs = isOk(pubmedResult) ? pubmedResult.value : [];
    const crossrefDocs = isOk(crossrefResult) ? crossrefResult.value : [];
    const arxivDocs = isOk(arxivResult) ? arxivResult.value : [];
    const retractionDocs = isOk(retractionResult) ? retractionResult.value : [];

    // Build typed evidence arrays from source documents.
    const pubmedEvidence: PubMedEvidence[] = pubmedDocs.map((doc, i) => ({
      id: `pubmed:${doc.id}:${i}`,
      label: doc.title,
      sourceUri: doc.url,
      sourceType: "pubmed-abstract" as const,
      excerpt: doc.snippet,
      relevanceScore: asScore(0.75),
      stance: "supports" as EvidenceStance,
      publishedAt: doc.publishedAt as IsoTimestamp | null,
      retrievedAt: now,
      metadata: {
        pmid: doc.id,
        doi: typeof doc.metadata["doi"] === "string" ? doc.metadata["doi"] : undefined,
        title: doc.title,
        authors: Array.isArray(doc.metadata["authors"]) ? (doc.metadata["authors"] as string[]) : [],
        journal: typeof doc.metadata["journal"] === "string" ? doc.metadata["journal"] : "Unknown",
        publicationDate: doc.publishedAt as IsoTimestamp | null,
        meshTerms: Array.isArray(doc.metadata["meshTerms"]) ? (doc.metadata["meshTerms"] as string[]) : [],
        citationCount: typeof doc.metadata["citationCount"] === "number" ? doc.metadata["citationCount"] : undefined,
        isRetracted: Boolean(doc.metadata["isRetracted"]),
      },
    }));

    const crossrefEvidence: CrossrefEvidence[] = crossrefDocs.map((doc, i) => ({
      id: `crossref:${doc.id}:${i}`,
      label: doc.title,
      sourceUri: doc.url,
      sourceType: "crossref-doi" as const,
      excerpt: doc.snippet,
      relevanceScore: asScore(0.8),
      stance: "supports" as EvidenceStance,
      publishedAt: doc.publishedAt as IsoTimestamp | null,
      retrievedAt: now,
      metadata: {
        doi: doc.id,
        title: doc.title,
        authors: Array.isArray(doc.metadata["authors"]) ? (doc.metadata["authors"] as string[]) : [],
        publisher: typeof doc.metadata["publisher"] === "string" ? doc.metadata["publisher"] : "Unknown",
        containerTitle: typeof doc.metadata["containerTitle"] === "string" ? doc.metadata["containerTitle"] : undefined,
        publicationDate: doc.publishedAt as IsoTimestamp | null,
        citedByCount: typeof doc.metadata["citedByCount"] === "number" ? doc.metadata["citedByCount"] : 0,
        type: typeof doc.metadata["type"] === "string" ? doc.metadata["type"] : "journal-article",
        isOpenAccess: Boolean(doc.metadata["isOpenAccess"]),
      },
    }));

    const arxivEvidence: ArxivEvidence[] = arxivDocs.map((doc, i) => ({
      id: `arxiv:${doc.id}:${i}`,
      label: doc.title,
      sourceUri: doc.url,
      sourceType: "arxiv-preprint" as const,
      excerpt: doc.snippet,
      relevanceScore: asScore(0.55),
      stance: "supports" as EvidenceStance,
      publishedAt: doc.publishedAt as IsoTimestamp | null,
      retrievedAt: now,
      metadata: {
        arxivId: doc.id,
        doi: typeof doc.metadata["doi"] === "string" ? doc.metadata["doi"] : undefined,
        title: doc.title,
        authors: Array.isArray(doc.metadata["authors"]) ? (doc.metadata["authors"] as string[]) : [],
        categories: Array.isArray(doc.metadata["categories"]) ? (doc.metadata["categories"] as string[]) : [],
        submittedAt: (doc.publishedAt ?? now) as IsoTimestamp,
        isPeerReviewed: false as const,
        abstract: doc.snippet,
      },
    }));

    const retractionEvidence: RetractionEvidence[] = retractionDocs.map((doc, i) => ({
      id: `retraction:${doc.id}:${i}`,
      label: doc.title,
      sourceUri: doc.url,
      sourceType: "retraction-notice" as const,
      excerpt: doc.snippet,
      relevanceScore: asScore(0.9),
      stance: "refutes" as EvidenceStance,
      publishedAt: doc.publishedAt as IsoTimestamp | null,
      retrievedAt: now,
      metadata: {
        doi: typeof doc.metadata["doi"] === "string" ? doc.metadata["doi"] : undefined,
        pmid: typeof doc.metadata["pmid"] === "string" ? doc.metadata["pmid"] : undefined,
        title: doc.title,
        journal: typeof doc.metadata["journal"] === "string" ? doc.metadata["journal"] : "Unknown",
        retractionDate: (doc.publishedAt ?? now) as IsoTimestamp,
        retractionReason: typeof doc.metadata["retractionReason"] === "string" ? doc.metadata["retractionReason"] : "Unknown reason",
        retractionDoi: typeof doc.metadata["retractionDoi"] === "string" ? doc.metadata["retractionDoi"] : undefined,
      },
    }));

    makeScientificEvidenceResult(
      claim.id,
      doi,
      pmid,
      pubmedEvidence,
      crossrefEvidence,
      arxivEvidence,
      retractionEvidence,
    );

    // Build verdict signals.
    const signals: VerdictSignal[] = [];

    for (const re of retractionEvidence) {
      signals.push(retractionRefuteSignal(re));
    }

    for (const pe of pubmedEvidence) {
      if (!pe.metadata.isRetracted) {
        const citations = typeof pe.metadata.citationCount === "number" ? pe.metadata.citationCount : 0;
        signals.push(peerReviewedSupportSignal(pe, citations > 50 ? 0.88 : 0.7));
      }
    }

    for (const ce of crossrefEvidence) {
      const citedByCount = ce.metadata.citedByCount;
      signals.push(peerReviewedSupportSignal(ce, citedByCount > 100 ? 0.9 : 0.72));
    }

    for (const ae of arxivEvidence) {
      signals.push(preprintSupportSignal(ae, 0.5));
    }

    if (signals.length === 0) {
      signals.push(noLiteratureSignal());
    } else if (
      signals.filter((s) => s.verdict === Verdict.SUPPORTED).length > 0 &&
      signals.filter((s) => s.verdict === Verdict.REFUTED).length > 0
    ) {
      const supportTitles: string[] = [
        ...pubmedEvidence.map((e) => e.metadata.title),
        ...crossrefEvidence.map((e) => e.metadata.title),
      ];
      signals.push(conflictingLiteratureSignal(supportTitles));
    }

    const allEvidence: DomainEvidence[] = [
      ...pubmedEvidence,
      ...crossrefEvidence,
      ...arxivEvidence,
      ...retractionEvidence,
    ];

    const evidence = makeEvidenceBundle(VERIFIER_ID, claim.text, allEvidence, now);

    return ok({ verifierId: VERIFIER_ID, evidence, signals });
  }
}
