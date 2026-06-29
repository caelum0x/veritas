// Earnings statement: generates periodic summaries of affiliate commissions and payouts.

import { ok, err, type Result, newId, epochToIso } from "@veritas/core";
import { z } from "zod";
import { AffiliateStatementNotFoundError } from "./errors.js";
import type { CommissionResult } from "./commission.js";
import type { Payout } from "./payout.js";

/** A single line item on an earnings statement. */
export interface StatementLineItem {
  readonly orderId: string;
  readonly occurredAt: string;
  readonly grossRevenueBaseUnits: bigint;
  readonly commissionBaseUnits: bigint;
  readonly tierId: string;
  readonly status: "pending" | "approved" | "paid";
}

/** A period earnings statement for an affiliate. */
export interface EarningsStatement {
  readonly id: string;
  readonly affiliateId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly lineItems: readonly StatementLineItem[];
  readonly totalCommissionBaseUnits: bigint;
  readonly totalPaidBaseUnits: bigint;
  readonly pendingBaseUnits: bigint;
  readonly payoutIds: readonly string[];
  readonly generatedAt: string;
}

/** Input for generating a statement. */
export interface GenerateStatementInput {
  readonly affiliateId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly commissions: readonly CommissionResult[];
  readonly payouts: readonly Payout[];
}

/** Repository interface for earnings statements. */
export interface StatementRepository {
  save(statement: EarningsStatement): Promise<Result<EarningsStatement>>;
  findById(id: string): Promise<Result<EarningsStatement>>;
  findByAffiliateId(affiliateId: string): Promise<readonly EarningsStatement[]>;
  findByPeriod(
    affiliateId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<readonly EarningsStatement[]>;
}

/** Generates an EarningsStatement from commission results and payouts for a period. */
export function generateStatement(input: GenerateStatementInput): EarningsStatement {
  const lineItems: readonly StatementLineItem[] = input.commissions.map((c) => ({
    orderId: c.orderId,
    occurredAt: input.periodEnd,
    grossRevenueBaseUnits: c.grossRevenueBaseUnits,
    commissionBaseUnits: c.commissionBaseUnits,
    tierId: c.tierId,
    status: "pending" as const,
  }));

  const totalCommissionBaseUnits = lineItems.reduce(
    (sum, item) => sum + item.commissionBaseUnits,
    0n
  );

  const paidPayouts = input.payouts.filter((p) => p.status === "paid");
  const totalPaidBaseUnits = paidPayouts.reduce(
    (sum, p) => sum + p.amountBaseUnits,
    0n
  );

  const pendingBaseUnits =
    totalCommissionBaseUnits > totalPaidBaseUnits
      ? totalCommissionBaseUnits - totalPaidBaseUnits
      : 0n;

  return {
    id: newId("stmt"),
    affiliateId: input.affiliateId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    lineItems,
    totalCommissionBaseUnits,
    totalPaidBaseUnits,
    pendingBaseUnits,
    payoutIds: input.payouts.map((p) => p.id),
    generatedAt: epochToIso(Date.now()),
  };
}

/** Zod schema for validating statement period request inputs. */
export const StatementPeriodSchema = z.object({
  affiliateId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export type StatementPeriod = z.infer<typeof StatementPeriodSchema>;

/** Summarizes multiple statements into aggregate totals. */
export function aggregateStatements(
  statements: readonly EarningsStatement[]
): {
  totalCommissionBaseUnits: bigint;
  totalPaidBaseUnits: bigint;
  pendingBaseUnits: bigint;
  statementCount: number;
} {
  const totalCommissionBaseUnits = statements.reduce(
    (sum, s) => sum + s.totalCommissionBaseUnits,
    0n
  );
  const totalPaidBaseUnits = statements.reduce(
    (sum, s) => sum + s.totalPaidBaseUnits,
    0n
  );
  const pendingBaseUnits = statements.reduce(
    (sum, s) => sum + s.pendingBaseUnits,
    0n
  );
  return {
    totalCommissionBaseUnits,
    totalPaidBaseUnits,
    pendingBaseUnits,
    statementCount: statements.length,
  };
}

/** In-memory implementation of StatementRepository for testing and development. */
export class InMemoryStatementRepository implements StatementRepository {
  private readonly store = new Map<string, EarningsStatement>();

  async save(statement: EarningsStatement): Promise<Result<EarningsStatement>> {
    this.store.set(statement.id, statement);
    return ok(statement);
  }

  async findById(id: string): Promise<Result<EarningsStatement>> {
    const statement = this.store.get(id);
    if (statement === undefined)
      return err(new AffiliateStatementNotFoundError(id));
    return ok(statement);
  }

  async findByAffiliateId(
    affiliateId: string
  ): Promise<readonly EarningsStatement[]> {
    return [...this.store.values()].filter(
      (s) => s.affiliateId === affiliateId
    );
  }

  async findByPeriod(
    affiliateId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<readonly EarningsStatement[]> {
    return [...this.store.values()].filter(
      (s) =>
        s.affiliateId === affiliateId &&
        s.periodStart >= periodStart &&
        s.periodEnd <= periodEnd
    );
  }
}
