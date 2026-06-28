// Incidents controller — validates requests with zod, calls IncidentsFeatureService, maps to HTTP.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  CreateIncidentBodySchema,
  UpdateIncidentBodySchema,
  TransitionStatusBodySchema,
  AddTimelineEntryBodySchema,
  CreatePostmortemBodySchema,
  ListIncidentsQuerySchema,
  MetricsQuerySchema,
} from "./incidents.schema.js";
import {
  toIncidentResponse,
  toTimelineEntryResponse,
  toPostmortemResponse,
  toMetricsResponse,
  toSloMetricsResponse,
} from "./incidents.mapper.js";
import type { IncidentsFeatureService } from "./incidents.service.js";
import { sendOk, sendCreated, sendPage } from "../../http/responder.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";

export class IncidentsController {
  constructor(private readonly service: IncidentsFeatureService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = ListIncidentsQuerySchema.parse(req.query);
      const result = await this.service.list(filter);
      if (isErr(result)) { next(result.error); return; }
      sendPage(
        res,
        result.value.items.map(toIncidentResponse),
        {
          total: result.value.total,
          page: Math.floor(filter.offset / filter.limit) + 1,
          limit: filter.limit,
        },
      );
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateIncidentBodySchema.parse(req.body);
      const result = await this.service.create(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toIncidentResponse(result.value));
    } catch (e) { next(e); }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.get(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toIncidentResponse(result.value));
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = UpdateIncidentBodySchema.parse(req.body);
      const result = await this.service.update(req.params["id"] ?? "", body);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toIncidentResponse(result.value));
    } catch (e) { next(e); }
  }

  async transition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = TransitionStatusBodySchema.parse(req.body);
      const actorId = (req as AuthenticatedRequest).principal.id;
      const result = await this.service.transition(req.params["id"] ?? "", status, actorId);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toIncidentResponse(result.value));
    } catch (e) { next(e); }
  }

  async assignResponder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).principal.id;
      const responderId = req.params["responderId"] ?? "";
      const result = await this.service.assignResponder(
        req.params["id"] ?? "",
        responderId,
        actorId,
      );
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toIncidentResponse(result.value));
    } catch (e) { next(e); }
  }

  async removeResponder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).principal.id;
      const responderId = req.params["responderId"] ?? "";
      const result = await this.service.removeResponder(
        req.params["id"] ?? "",
        responderId,
        actorId,
      );
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toIncidentResponse(result.value));
    } catch (e) { next(e); }
  }

  async addTimelineEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = AddTimelineEntryBodySchema.parse(req.body);
      const actorId = (req as AuthenticatedRequest).principal.id;
      const result = await this.service.addTimelineEntry(
        req.params["id"] ?? "",
        body,
        actorId,
      );
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toTimelineEntryResponse(result.value));
    } catch (e) { next(e); }
  }

  async listTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getTimeline(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value.map(toTimelineEntryResponse));
    } catch (e) { next(e); }
  }

  async createPostmortem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreatePostmortemBodySchema.parse(req.body);
      const actorId = (req as AuthenticatedRequest).principal.id;
      const result = await this.service.createPostmortem(
        req.params["id"] ?? "",
        body,
        actorId,
      );
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toPostmortemResponse(result.value));
    } catch (e) { next(e); }
  }

  async getPostmortem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getPostmortem(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toPostmortemResponse(result.value));
    } catch (e) { next(e); }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = MetricsQuerySchema.parse(req.query);
      const result = await this.service.getMetrics(query);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toMetricsResponse(result.value));
    } catch (e) { next(e); }
  }

  async getSloMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = MetricsQuerySchema.parse(req.query);
      const result = await this.service.getSloMetrics(query);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toSloMetricsResponse(result.value));
    } catch (e) { next(e); }
  }
}
