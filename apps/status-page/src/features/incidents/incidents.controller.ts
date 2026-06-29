// Incidents controller — validates requests and delegates to the incidents service.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  CreateIncidentSchema,
  UpdateIncidentSchema,
  IncidentListFilterSchema,
  CreateTimelineEntrySchema,
  CreatePostmortemSchema,
} from "./incidents.schema.js";
import {
  TransitionStatusBodySchema,
  AssignResponderBodySchema,
  RemoveResponderParamsSchema,
  IncidentIdParamsSchema,
  MetricsQuerySchema,
  ListIncidentsQuerySchema,
} from "./incidents.schema.js";
import {
  createIncident,
  getIncident,
  updateIncident,
  transitionStatus,
  assignResponder,
  removeResponder,
  listIncidents,
  addTimelineEntry,
  getTimeline,
  createPostmortem,
  getPostmortem,
  updatePostmortem,
  getMetrics,
  getSloMetrics,
} from "./incidents.service.js";
import {
  mapIncident,
  mapTimelineEntry,
  mapPostmortem,
  mapMetrics,
  mapSloMetrics,
} from "./incidents.mapper.js";
import type { IncidentsDeps } from "./incidents.service.js";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function notFound(res: Response, msg: string): void {
  res.status(404).json({ success: false, error: { message: msg } });
}

function badRequest(res: Response, msg: string): void {
  res.status(400).json({ success: false, error: { message: msg } });
}

function serverError(res: Response, msg: string): void {
  res.status(500).json({ success: false, error: { message: msg } });
}

/** POST /api/incidents */
export async function handleCreateIncident(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = CreateIncidentSchema.safeParse(req.body);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const result = await createIncident(deps, parsed.data);
    if (isErr(result)) { serverError(res, errMsg(result.error)); return; }
    res.status(201).json({ success: true, data: mapIncident(result.value) });
  } catch (cause) { next(cause); }
}

/** GET /api/incidents */
export async function handleListIncidents(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ListIncidentsQuerySchema.safeParse(req.query);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const filter = parsed.data as Parameters<typeof listIncidents>[1];
    const result = await listIncidents(deps, filter);
    if (isErr(result)) { serverError(res, errMsg(result.error)); return; }
    const { items, total } = result.value;
    res.json({ success: true, data: { items: items.map(mapIncident), total } });
  } catch (cause) { next(cause); }
}

/** GET /api/incidents/:id */
export async function handleGetIncident(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const result = await getIncident(deps, parsed.data.id);
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapIncident(result.value) });
  } catch (cause) { next(cause); }
}

/** PATCH /api/incidents/:id */
export async function handleUpdateIncident(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paramsParsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) { badRequest(res, paramsParsed.error.message); return; }
    const bodyParsed = UpdateIncidentSchema.safeParse(req.body);
    if (!bodyParsed.success) { badRequest(res, bodyParsed.error.message); return; }
    const result = await updateIncident(deps, paramsParsed.data.id, bodyParsed.data);
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapIncident(result.value) });
  } catch (cause) { next(cause); }
}

/** POST /api/incidents/:id/transition */
export async function handleTransitionStatus(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paramsParsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) { badRequest(res, paramsParsed.error.message); return; }
    const bodyParsed = TransitionStatusBodySchema.safeParse(req.body);
    if (!bodyParsed.success) { badRequest(res, bodyParsed.error.message); return; }
    const result = await transitionStatus(
      deps,
      paramsParsed.data.id,
      bodyParsed.data.status,
      bodyParsed.data.actorId,
    );
    if (isErr(result)) { badRequest(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapIncident(result.value) });
  } catch (cause) { next(cause); }
}

/** POST /api/incidents/:id/responders */
export async function handleAssignResponder(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paramsParsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) { badRequest(res, paramsParsed.error.message); return; }
    const bodyParsed = AssignResponderBodySchema.safeParse(req.body);
    if (!bodyParsed.success) { badRequest(res, bodyParsed.error.message); return; }
    const result = await assignResponder(
      deps,
      paramsParsed.data.id,
      bodyParsed.data.responderId,
      bodyParsed.data.actorId,
    );
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapIncident(result.value) });
  } catch (cause) { next(cause); }
}

/** DELETE /api/incidents/:id/responders/:responderId */
export async function handleRemoveResponder(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = RemoveResponderParamsSchema.safeParse(req.params);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const actorId = typeof req.body?.actorId === "string" ? req.body.actorId : "system";
    const result = await removeResponder(deps, parsed.data.id, parsed.data.responderId, actorId);
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapIncident(result.value) });
  } catch (cause) { next(cause); }
}

/** POST /api/incidents/:id/timeline */
export async function handleAddTimelineEntry(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paramsParsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) { badRequest(res, paramsParsed.error.message); return; }
    const bodyParsed = CreateTimelineEntrySchema.safeParse({
      ...req.body,
      incidentId: paramsParsed.data.id,
    });
    if (!bodyParsed.success) { badRequest(res, bodyParsed.error.message); return; }
    const result = await addTimelineEntry(deps, bodyParsed.data);
    if (isErr(result)) { serverError(res, errMsg(result.error)); return; }
    res.status(201).json({ success: true, data: mapTimelineEntry(result.value) });
  } catch (cause) { next(cause); }
}

/** GET /api/incidents/:id/timeline */
export async function handleGetTimeline(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const result = await getTimeline(deps, parsed.data.id);
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: { items: result.value.map(mapTimelineEntry), total: result.value.length } });
  } catch (cause) { next(cause); }
}

/** POST /api/incidents/:id/postmortem */
export async function handleCreatePostmortem(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paramsParsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) { badRequest(res, paramsParsed.error.message); return; }
    const bodyParsed = CreatePostmortemSchema.safeParse({
      ...req.body,
      incidentId: paramsParsed.data.id,
    });
    if (!bodyParsed.success) { badRequest(res, bodyParsed.error.message); return; }
    const result = await createPostmortem(deps, bodyParsed.data);
    if (isErr(result)) { serverError(res, errMsg(result.error)); return; }
    res.status(201).json({ success: true, data: mapPostmortem(result.value) });
  } catch (cause) { next(cause); }
}

/** GET /api/incidents/:id/postmortem */
export async function handleGetPostmortem(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const result = await getPostmortem(deps, parsed.data.id);
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapPostmortem(result.value) });
  } catch (cause) { next(cause); }
}

/** PATCH /api/incidents/:id/postmortem */
export async function handleUpdatePostmortem(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = IncidentIdParamsSchema.safeParse(req.params);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const result = await updatePostmortem(deps, parsed.data.id, req.body as Parameters<typeof updatePostmortem>[2]);
    if (isErr(result)) { notFound(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapPostmortem(result.value) });
  } catch (cause) { next(cause); }
}

/** GET /api/incidents/metrics */
export async function handleGetMetrics(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = MetricsQuerySchema.safeParse(req.query);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const { targetMttrMs, ...filter } = parsed.data;
    const result = await getMetrics(deps, filter as Parameters<typeof getMetrics>[1]);
    if (isErr(result)) { serverError(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapMetrics(result.value) });
  } catch (cause) { next(cause); }
}

/** GET /api/incidents/slo-metrics */
export async function handleGetSloMetrics(
  deps: IncidentsDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = MetricsQuerySchema.safeParse(req.query);
    if (!parsed.success) { badRequest(res, parsed.error.message); return; }
    const { targetMttrMs, from, to } = parsed.data;
    const result = await getSloMetrics(deps, { from, to }, targetMttrMs);
    if (isErr(result)) { serverError(res, errMsg(result.error)); return; }
    res.json({ success: true, data: mapSloMetrics(result.value) });
  } catch (cause) { next(cause); }
}
