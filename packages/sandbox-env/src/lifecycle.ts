// Manages sandbox lifecycle transitions: activate, suspend, resume, terminate
import { Result, ok, err } from "@veritas/core";
import { Sandbox, SandboxLifecycleEvent } from "./types.js";
import {
  SandboxNotFoundError,
  SandboxSuspendedError,
  SandboxTerminatedError,
} from "./errors.js";
import { revokeAllCredentials } from "./credentials.js";

const eventLog: SandboxLifecycleEvent[] = [];

function emitEvent(
  sandboxId: string,
  event: SandboxLifecycleEvent["event"],
  actor?: string,
  reason?: string
): void {
  eventLog.push({
    sandboxId,
    event,
    reason,
    actor,
    timestamp: new Date().toISOString(),
  });
}

export function activateSandbox(
  sandbox: Sandbox,
  actor?: string
): Result<Sandbox, SandboxTerminatedError> {
  if (sandbox.status === "terminated") {
    return err(new SandboxTerminatedError(sandbox.id));
  }
  const now = new Date().toISOString();
  const updated: Sandbox = { ...sandbox, status: "active", updatedAt: now };
  emitEvent(sandbox.id, "activated", actor);
  return ok(updated);
}

export function suspendSandbox(
  sandbox: Sandbox,
  reason?: string,
  actor?: string
): Result<Sandbox, SandboxTerminatedError | SandboxSuspendedError> {
  if (sandbox.status === "terminated") {
    return err(new SandboxTerminatedError(sandbox.id));
  }
  if (sandbox.status === "suspended") {
    return err(new SandboxSuspendedError(sandbox.id));
  }
  const now = new Date().toISOString();
  const updated: Sandbox = { ...sandbox, status: "suspended", suspendedAt: now, updatedAt: now };
  emitEvent(sandbox.id, "suspended", actor, reason);
  return ok(updated);
}

export function resumeSandbox(
  sandbox: Sandbox,
  actor?: string
): Result<Sandbox, SandboxTerminatedError | SandboxNotFoundError> {
  if (sandbox.status === "terminated") {
    return err(new SandboxTerminatedError(sandbox.id));
  }
  const now = new Date().toISOString();
  const updated: Sandbox = {
    ...sandbox,
    status: "active",
    suspendedAt: undefined,
    updatedAt: now,
  };
  emitEvent(sandbox.id, "resumed", actor);
  return ok(updated);
}

export function terminateSandbox(
  sandbox: Sandbox,
  reason?: string,
  actor?: string
): Result<Sandbox, SandboxTerminatedError> {
  if (sandbox.status === "terminated") {
    return err(new SandboxTerminatedError(sandbox.id));
  }
  const now = new Date().toISOString();
  const updated: Sandbox = {
    ...sandbox,
    status: "terminated",
    terminatedAt: now,
    updatedAt: now,
  };
  revokeAllCredentials(sandbox.id);
  emitEvent(sandbox.id, "terminated", actor, reason);
  return ok(updated);
}

export function resetSandbox(
  sandbox: Sandbox,
  actor?: string
): Result<Sandbox, SandboxTerminatedError | SandboxSuspendedError> {
  if (sandbox.status === "terminated") {
    return err(new SandboxTerminatedError(sandbox.id));
  }
  if (sandbox.status === "suspended") {
    return err(new SandboxSuspendedError(sandbox.id));
  }
  revokeAllCredentials(sandbox.id);
  emitEvent(sandbox.id, "reset", actor);
  return ok({ ...sandbox, updatedAt: new Date().toISOString() });
}

export function getLifecycleEvents(sandboxId: string): readonly SandboxLifecycleEvent[] {
  return eventLog.filter((e) => e.sandboxId === sandboxId);
}
