// reset.ts: sandbox reset operations — wipe state and re-apply seed data.

import { type Result, ok, err } from "@veritas/core";
import { type Sandbox, type SandboxUsage } from "./types.js";
import { SandboxNotFoundError, SandboxTerminatedError } from "./errors.js";
import { updateSandbox } from "./sandbox.js";

export interface ResetOptions {
  /** When true, usage counters are cleared along with data. */
  readonly clearUsage?: boolean;
  /** Optional actor identifier for audit purposes. */
  readonly actor?: string;
}

export interface ResetResult {
  readonly sandbox: Sandbox;
  readonly clearedUsage: boolean;
  readonly resetAt: string;
}

/** In-memory usage registry for tracking (cleared on reset). */
const usageRegistry = new Map<string, SandboxUsage>();

/** Resets the sandbox to a clean active state without credential rotation. */
export function resetSandbox(
  sandbox: Readonly<Sandbox>,
  options: ResetOptions = {},
): Result<ResetResult, SandboxNotFoundError | SandboxTerminatedError> {
  if (sandbox.status === "terminated") {
    return err(new SandboxTerminatedError(sandbox.id));
  }

  const now = new Date().toISOString();
  const clearedUsage = options.clearUsage ?? true;

  if (clearedUsage) {
    usageRegistry.delete(sandbox.id);
  }

  const resetSandboxState = updateSandbox(sandbox, {
    status: "active",
    updatedAt: now,
  });

  return ok({
    sandbox: resetSandboxState,
    clearedUsage,
    resetAt: now,
  });
}

/** Records usage entry for a sandbox window. */
export function recordUsage(usage: SandboxUsage): void {
  usageRegistry.set(usage.sandboxId, usage);
}

/** Retrieves current usage for a sandbox, or undefined if not tracked. */
export function getUsage(sandboxId: string): SandboxUsage | undefined {
  return usageRegistry.get(sandboxId);
}

/** Returns an empty usage object for a sandbox (for quota checks on fresh reset). */
export function emptyUsage(sandboxId: string): SandboxUsage {
  const now = new Date().toISOString();
  return {
    sandboxId,
    windowStart: now,
    windowEnd: now,
    requestCount: 0,
    storageUsedMb: 0,
  };
}
