// Credits feature service: delegates to @veritas/credits CreditService via container deps.
import type { Result } from "@veritas/core";
import type { CreditBalance, CreditGrant, LedgerEntry, LedgerEntryKind } from "@veritas/credits";
import type { Deps } from "../../container.js";
import type {
  GrantBody,
  ConsumeBody,
  ReserveBody,
  ReleaseBody,
} from "./credits.schema.js";
import type { UserId } from "@veritas/core";

export class CreditsService {
  constructor(private readonly deps: Deps) {}

  async getBalance(userId: string): Promise<Result<CreditBalance>> {
    return this.deps.creditService.getBalance(userId as UserId);
  }

  async grant(body: GrantBody): Promise<Result<CreditGrant>> {
    return this.deps.creditService.grant({
      userId: body.userId as UserId,
      amount: body.amount,
      source: body.source,
      reason: body.reason,
      expiresAt: body.expiresAt,
      metadata: body.metadata,
    });
  }

  async consume(body: ConsumeBody): Promise<Result<CreditBalance>> {
    return this.deps.creditService.consume({
      userId: body.userId as UserId,
      amount: body.amount,
      note: body.note,
      referenceId: body.referenceId,
    });
  }

  async reserve(body: ReserveBody): Promise<Result<string>> {
    return this.deps.creditService.reserve({
      userId: body.userId as UserId,
      amount: body.amount,
      note: body.note,
      referenceId: body.referenceId,
      expiresAt: body.expiresAt,
    });
  }

  async release(body: ReleaseBody): Promise<Result<CreditBalance>> {
    return this.deps.creditService.release({
      reservationId: body.reservationId,
      consume: body.consume,
      amount: body.amount,
      note: body.note,
    });
  }

  async expireCredits(userId: string): Promise<Result<number>> {
    return this.deps.creditService.expireCredits(userId as UserId);
  }

  async getLedger(
    userId: string,
    kind?: LedgerEntryKind,
  ): Promise<Result<ReadonlyArray<LedgerEntry>>> {
    return this.deps.creditStore.findLedgerEntries(userId as UserId, kind);
  }
}
