// Incidents controller: handles HTTP request/response for incident lifecycle endpoints.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import {
  IncidentService,
  UpdateIncidentSchema,
  IncidentListFilterSchema,
  CreateTimelineEntrySchema,
  CreatePostmortemSchema,
} from "@veritas/incident";
import type { IncidentListFilter } from "@veritas/incident";
import { sendOk, sendCreated, sendPage } from "../http/responder.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

/** Local schema matching IncidentService.createIncident parameter (types.ts shape). */
const CreateIncidentBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4", "SEV5"]),
  affectedServices: z.array(z.string()).default([]),
  labels: z.record(z.string()).default({}),
  detectedAt: z.string().optional(),
});

/** Local status schema matching IncidentService.transitionStatus (types.ts IncidentStatus). */
const TransitionStatusSchema = z.object({
  status: z.enum([
    "DETECTED",
    "TRIAGED",
    "ACKNOWLEDGED",
    "INVESTIGATING",
    "MITIGATED",
    "RESOLVED",
    "CLOSED",
  ]),
});

export class IncidentsController {
  constructor(private readonly service: IncidentService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = IncidentListFilterSchema.parse({
        ...req.query,
        limit: req.query["limit"] ? Number(req.query["limit"]) : undefined,
        offset: req.query["offset"] ? Number(req.query["offset"]) : undefined,
      }) as IncidentListFilter;
      const result = await this.service.listIncidents(filter);
      if (isErr(result)) { next(result.error); return; }
      const limit = Number(filter.limit ?? 50);
      const offset = Number(filter.offset ?? 0);
      sendPage(res, result.value.items, {
        total: result.value.total,
        page: Math.floor(offset / limit) + 1,
        limit,
      });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = CreateIncidentBodySchema.parse(req.body);
      const result = await this.service.createIncident(data);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, result.value);
    } catch (e) { next(e); }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getIncident(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patch = UpdateIncidentSchema.parse(req.body);
      const result = await this.service.updateIncident(req.params["id"] ?? "", patch);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async transition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = TransitionStatusSchema.parse(req.body);
      const actorId = (req as AuthenticatedRequest).principal.id;
      const result = await this.service.transitionStatus(req.params["id"] ?? "", status, actorId);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async addTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = CreateTimelineEntrySchema.parse({
        ...req.body,
        incidentId: req.params["id"] ?? "",
        actorId: (req as AuthenticatedRequest).principal.id,
      });
      const result = await this.service.addTimelineEntry(data);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, result.value);
    } catch (e) { next(e); }
  }

  async listTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getTimeline(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async createPostmortem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = CreatePostmortemSchema.parse({
        ...req.body,
        incidentId: req.params["id"] ?? "",
      });
      const result = await this.service.createPostmortem(data);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, result.value);
    } catch (e) { next(e); }
  }

  async getPostmortem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getPostmortem(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = {
        from: typeof req.query["from"] === "string" ? req.query["from"] : undefined,
        to: typeof req.query["to"] === "string" ? req.query["to"] : undefined,
        severity: typeof req.query["severity"] === "string"
          ? req.query["severity"] as "SEV1" | "SEV2" | "SEV3" | "SEV4" | "SEV5"
          : undefined,
        status: typeof req.query["status"] === "string"
          ? req.query["status"] as "DETECTED" | "TRIAGED" | "ACKNOWLEDGED" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" | "CLOSED"
          : undefined,
      };
      const result = await this.service.getMetrics(filter);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }
}
