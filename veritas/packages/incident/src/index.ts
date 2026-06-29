// Public surface re-export for @veritas/incident.
// The canonical incident/postmortem/timeline model lives in types.js — the same
// shapes IncidentService operates on. (Earlier incident.ts/postmortem.ts/
// state-machine.ts held a parallel, divergent model that no consumer used; it
// was removed so the public surface matches the service's actual types.)
export * from './types.js';
export * from './severity.js';
export * from './on-call.js';
export * from './escalation.js';
export * from './responder.js';
export * from './timeline.js';
export * from './detection.js';
export * from './notification.js';
export * from './store.js';
export * from './service.js';
export * from './metrics.js';
export * from './errors.js';
