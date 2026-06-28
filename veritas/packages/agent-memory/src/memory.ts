// Agent memory record — core data structure representing a single stored memory.

import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";

export const MemoryKindSchema = z.enum(["episodic", "semantic", "working", "procedural"]);
export type MemoryKind = z.infer<typeof MemoryKindSchema>;

export const MemorySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  kind: MemoryKindSchema,
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).default({}),
  importance: z.number().min(0).max(1).default(0.5),
  accessCount: z.number().int().nonnegative().default(0),
  createdAt: z.string() as unknown as z.ZodType<IsoTimestamp>,
  updatedAt: z.string() as unknown as z.ZodType<IsoTimestamp>,
  lastAccessedAt: z.string().optional() as unknown as z.ZodType<IsoTimestamp | undefined>,
  expiresAt: z.string().optional() as unknown as z.ZodType<IsoTimestamp | undefined>,
  decayFactor: z.number().min(0).max(1).default(1.0),
  tags: z.array(z.string()).default([]),
  sessionId: z.string().optional(),
  sourceMemoryIds: z.array(z.string()).default([]),
});

export type Memory = z.infer<typeof MemorySchema>;

export const CreateMemorySchema = MemorySchema.omit({
  accessCount: true,
  decayFactor: true,
}).partial({
  importance: true,
  metadata: true,
  tags: true,
  sourceMemoryIds: true,
  embedding: true,
  lastAccessedAt: true,
  expiresAt: true,
  sessionId: true,
});

export type CreateMemory = z.infer<typeof CreateMemorySchema>;

export function withAccess(memory: Readonly<Memory>, now: IsoTimestamp): Memory {
  return {
    ...memory,
    accessCount: memory.accessCount + 1,
    lastAccessedAt: now,
  };
}

export function withDecay(memory: Readonly<Memory>, factor: number): Memory {
  return {
    ...memory,
    decayFactor: Math.max(0, memory.decayFactor * factor),
  };
}

export function effectiveImportance(memory: Readonly<Memory>): number {
  return memory.importance * memory.decayFactor;
}
