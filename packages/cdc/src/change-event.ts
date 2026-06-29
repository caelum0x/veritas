// change-event.ts: immutable change data capture event definition
import { z } from "zod";
import { IsoTimestamp, ContentHash, JsonValue, newId } from "@veritas/core";

/** Operation type for a CDC event */
export type CdcOperation = "insert" | "update" | "delete" | "truncate";

/** Branded CDC event identifier */
export type CdcEventId = string & { readonly __brand: "CdcEventId" };

export const newCdcEventId = (): CdcEventId => newId("cdc") as unknown as CdcEventId;

/** Schema definition for a change event */
export const CdcEventSchema = z.object({
  id: z.string(),
  table: z.string().min(1),
  schema: z.string().min(1).default("public"),
  operation: z.enum(["insert", "update", "delete", "truncate"]),
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
  pk: z.record(z.union([z.string(), z.number()])),
  txId: z.string().optional(),
  lsn: z.string().optional(),
  contentHash: z.string().optional(),
  occurredAt: z.string(),
  source: z.string().min(1),
});

/** Immutable CDC event record */
export type CdcEvent = Readonly<{
  id: CdcEventId;
  table: string;
  schema: string;
  operation: CdcOperation;
  before: Readonly<Record<string, unknown>> | null;
  after: Readonly<Record<string, unknown>> | null;
  pk: Readonly<Record<string, string | number>>;
  txId?: string;
  lsn?: string;
  contentHash?: ContentHash;
  occurredAt: IsoTimestamp;
  source: string;
}>;

/** Factory to build a CdcEvent from raw data */
export const makeCdcEvent = (
  table: string,
  schema: string,
  operation: CdcOperation,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  pk: Record<string, string | number>,
  source: string,
  opts?: {
    txId?: string;
    lsn?: string;
    contentHash?: ContentHash;
    occurredAt?: IsoTimestamp;
  }
): CdcEvent => ({
  id: newCdcEventId(),
  table,
  schema,
  operation,
  before: before ? Object.freeze({ ...before }) : null,
  after: after ? Object.freeze({ ...after }) : null,
  pk: Object.freeze({ ...pk }),
  txId: opts?.txId,
  lsn: opts?.lsn,
  contentHash: opts?.contentHash,
  occurredAt: opts?.occurredAt ?? (new Date().toISOString() as IsoTimestamp),
  source,
});

/** Serialize a CdcEvent to a plain JSON-safe object */
export const serializeCdcEvent = (event: CdcEvent): Record<string, JsonValue> => ({
  id: event.id,
  table: event.table,
  schema: event.schema,
  operation: event.operation,
  before: (event.before as JsonValue) ?? null,
  after: (event.after as JsonValue) ?? null,
  pk: event.pk as unknown as JsonValue,
  txId: event.txId ?? null,
  lsn: event.lsn ?? null,
  contentHash: event.contentHash ?? null,
  occurredAt: event.occurredAt,
  source: event.source,
});
