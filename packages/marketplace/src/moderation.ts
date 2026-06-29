// Listing moderation: open cases, record verdicts, and apply listing status transitions.

import { ok, err, type Result, newId, epochToIso } from "@veritas/core";
import type { ListingStore } from "./store.js";
import type {
  Listing,
  ListingId,
  ModerationCase,
  ModerationCaseId,
  ModerationVerdictInput,
} from "./types.js";
import { moderationVerdictInputSchema } from "./types.js";
import {
  ListingNotFoundError,
  ListingValidationError,
  ListingStateError,
} from "./errors.js";

// ---------------------------------------------------------------------------
// In-memory ModerationCase store (port — swap with DB implementation at wire-up)
// ---------------------------------------------------------------------------

/** Port interface for persisting moderation cases. */
export interface ModerationStore {
  getCase(id: ModerationCaseId): Promise<ModerationCase | undefined>;
  getCaseByListing(listingId: ListingId): Promise<ModerationCase | undefined>;
  saveCase(c: ModerationCase): Promise<ModerationCase>;
}

/** In-memory implementation of ModerationStore for dev/testing. */
export class InMemoryModerationStore implements ModerationStore {
  private readonly cases = new Map<ModerationCaseId, ModerationCase>();

  async getCase(id: ModerationCaseId): Promise<ModerationCase | undefined> {
    return this.cases.get(id);
  }

  async getCaseByListing(listingId: ListingId): Promise<ModerationCase | undefined> {
    return [...this.cases.values()].find((c) => c.listingId === listingId);
  }

  async saveCase(c: ModerationCase): Promise<ModerationCase> {
    this.cases.set(c.id, c);
    return c;
  }
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Open a moderation case for a listing entering pending_review. */
export async function openModerationCase(
  listingStore: ListingStore,
  moderationStore: ModerationStore,
  listingId: ListingId,
): Promise<Result<ModerationCase>> {
  const getResult = await listingStore.getById(listingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(listingId));
  }
  const listing = getResult.value;

  if (listing.status !== "pending_review") {
    return err(
      new ListingStateError(
        `Moderation case can only be opened for pending_review listings; current: "${listing.status}"`,
        { details: { listingId, currentStatus: listing.status } },
      ),
    );
  }

  const existing = await moderationStore.getCaseByListing(listingId);
  if (existing !== undefined && existing.resolvedAt === undefined) {
    return ok(existing);
  }

  const now = epochToIso(Date.now());
  const moderationCase: ModerationCase = {
    id: newId("mcase") as unknown as ModerationCaseId,
    listingId,
    reviewerId: undefined,
    verdict: undefined,
    notes: "",
    createdAt: now,
    resolvedAt: undefined,
  };

  const saved = await moderationStore.saveCase(moderationCase);
  return ok(saved);
}

/** Submit a moderation verdict, updating the case and the listing status. */
export async function submitModerationVerdict(
  listingStore: ListingStore,
  moderationStore: ModerationStore,
  input: unknown,
): Promise<Result<{ listing: Listing; moderationCase: ModerationCase }>> {
  const parsed = moderationVerdictInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ListingValidationError(parsed.error.errors[0]?.message ?? "Invalid verdict input"));
  }
  const verdictInput = parsed.data as ModerationVerdictInput;

  const moderationCase = await moderationStore.getCase(
    verdictInput.caseId as ModerationCaseId,
  );
  if (moderationCase === undefined) {
    return err(new ListingNotFoundError(`moderation case ${verdictInput.caseId}`));
  }
  if (moderationCase.resolvedAt !== undefined) {
    return err(
      new ListingStateError(`Moderation case ${verdictInput.caseId} is already resolved`, {
        details: { caseId: verdictInput.caseId },
      }),
    );
  }

  const getResult = await listingStore.getById(moderationCase.listingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(moderationCase.listingId));
  }
  const listing = getResult.value;

  const now = epochToIso(Date.now());

  const resolvedCase: ModerationCase = {
    ...moderationCase,
    reviewerId: verdictInput.reviewerId as unknown as typeof moderationCase.reviewerId,
    verdict: verdictInput.verdict,
    notes: verdictInput.notes,
    resolvedAt: now,
  };
  await moderationStore.saveCase(resolvedCase);

  const nextStatus: Listing["status"] =
    verdictInput.verdict === "approved"
      ? "published"
      : verdictInput.verdict === "rejected"
        ? "archived"
        : "draft";

  const updatedListing: Listing = {
    ...listing,
    status: nextStatus,
    updatedAt: now,
  };

  const saveResult = await listingStore.save(updatedListing);
  if (!saveResult.ok) return err(saveResult.error);

  return ok({ listing: saveResult.value, moderationCase: resolvedCase });
}

/** Retrieve an open moderation case for a listing (undefined if none). */
export async function getActiveModerationCase(
  moderationStore: ModerationStore,
  listingId: ListingId,
): Promise<ModerationCase | undefined> {
  const found = await moderationStore.getCaseByListing(listingId);
  if (found === undefined || found.resolvedAt !== undefined) return undefined;
  return found;
}
