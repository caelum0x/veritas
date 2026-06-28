// Responder assignment — attaches and tracks on-call responders to an incident.
import { z } from "zod";
import { newId, type Result, ok, err } from "@veritas/core";

export const ResponderRoleSchema = z.enum(["incident_commander", "tech_lead", "comms_lead", "observer"]);
export type ResponderRole = z.infer<typeof ResponderRoleSchema>;

export const ResponderStatusSchema = z.enum(["paged", "acknowledged", "active", "released"]);
export type ResponderStatus = z.infer<typeof ResponderStatusSchema>;

export const ResponderSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  userId: z.string(),
  role: ResponderRoleSchema,
  status: ResponderStatusSchema,
  assignedAt: z.string(),
  acknowledgedAt: z.string().nullable(),
  releasedAt: z.string().nullable(),
});
export type Responder = z.infer<typeof ResponderSchema>;

export interface AssignResponderOptions {
  readonly incidentId: string;
  readonly userId: string;
  readonly role: ResponderRole;
  readonly now: string;
}

export function assignResponder(opts: AssignResponderOptions): Responder {
  return {
    id: newId("resp"),
    incidentId: opts.incidentId,
    userId: opts.userId,
    role: opts.role,
    status: "paged",
    assignedAt: opts.now,
    acknowledgedAt: null,
    releasedAt: null,
  };
}

export function acknowledgeResponder(
  responder: Responder,
  now: string,
): Result<Responder> {
  if (responder.status !== "paged") {
    return err(new Error(`Responder ${responder.id} is not in paged state`));
  }
  return ok({ ...responder, status: "acknowledged" as const, acknowledgedAt: now });
}

export function activateResponder(responder: Responder): Result<Responder> {
  if (responder.status !== "acknowledged") {
    return err(new Error(`Responder ${responder.id} must acknowledge before activating`));
  }
  return ok({ ...responder, status: "active" as const });
}

export function releaseResponder(
  responder: Responder,
  now: string,
): Result<Responder> {
  if (responder.status === "released") {
    return err(new Error(`Responder ${responder.id} is already released`));
  }
  return ok({ ...responder, status: "released" as const, releasedAt: now });
}

export function getActiveResponders(responders: readonly Responder[]): readonly Responder[] {
  return responders.filter((r) => r.status === "active" || r.status === "acknowledged");
}

export function findIncidentCommander(
  responders: readonly Responder[],
): Responder | undefined {
  return responders.find((r) => r.role === "incident_commander" && r.status !== "released");
}

export function hasDuplicateRole(
  responders: readonly Responder[],
  role: ResponderRole,
  excludeUserId?: string,
): boolean {
  return responders.some(
    (r) =>
      r.role === role &&
      r.status !== "released" &&
      (excludeUserId === undefined || r.userId !== excludeUserId),
  );
}
