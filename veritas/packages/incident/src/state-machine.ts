// Incident lifecycle state machine: valid transitions and guard logic.
import { Result, ok, err } from "@veritas/core";
import { IncidentStatus } from "./incident.js";

export interface Transition {
  readonly from: IncidentStatus;
  readonly to: IncidentStatus;
  readonly label: string;
}

const ALLOWED_TRANSITIONS: readonly Transition[] = [
  { from: "DETECTED", to: "ACKNOWLEDGED", label: "Acknowledge" },
  { from: "DETECTED", to: "INVESTIGATING", label: "Investigate" },
  { from: "ACKNOWLEDGED", to: "INVESTIGATING", label: "Investigate" },
  { from: "INVESTIGATING", to: "MITIGATING", label: "Mitigate" },
  { from: "INVESTIGATING", to: "RESOLVED", label: "Resolve" },
  { from: "MITIGATING", to: "RESOLVED", label: "Resolve" },
  { from: "RESOLVED", to: "CLOSED", label: "Close" },
  { from: "RESOLVED", to: "INVESTIGATING", label: "Reopen" },
  { from: "CLOSED", to: "INVESTIGATING", label: "Reopen" },
];

const TRANSITION_MAP = new Map<string, Transition>(
  ALLOWED_TRANSITIONS.map((t) => [`${t.from}:${t.to}`, t])
);

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return TRANSITION_MAP.has(`${from}:${to}`);
}

export function validateTransition(
  from: IncidentStatus,
  to: IncidentStatus
): Result<Transition, string> {
  const transition = TRANSITION_MAP.get(`${from}:${to}`);
  if (!transition) {
    return err(
      `Invalid transition from "${from}" to "${to}". Allowed transitions from "${from}": ${getAllowedTargets(from).join(", ") || "none"}`
    );
  }
  return ok(transition);
}

export function getAllowedTargets(from: IncidentStatus): IncidentStatus[] {
  return ALLOWED_TRANSITIONS
    .filter((t) => t.from === from)
    .map((t) => t.to);
}

export function isTerminalStatus(status: IncidentStatus): boolean {
  return status === "CLOSED";
}

export function isActiveStatus(status: IncidentStatus): boolean {
  return status === "DETECTED" || status === "ACKNOWLEDGED" || status === "INVESTIGATING" || status === "MITIGATING";
}

export function isResolvedOrClosed(status: IncidentStatus): boolean {
  return status === "RESOLVED" || status === "CLOSED";
}

export { ALLOWED_TRANSITIONS };
