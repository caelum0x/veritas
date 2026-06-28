// HTTP controller for onboarding flows and steps; validates requests, calls service, maps responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  CreateFlowBodySchema,
  AddStepBodySchema,
  FlowParamsSchema,
  StepParamsSchema,
  UserQuerySchema,
} from "./onboarding.schema.js";
import {
  toFlowResponse,
  toFlowWithStepsResponse,
  toStepResponse,
  toChecklistResponse,
} from "./onboarding.mapper.js";
import type { OnboardingService } from "./onboarding.service.js";

export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  async createFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateFlowBodySchema.parse(req.body);
      const result = this.svc.createFlow(body);
      if (isErr(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toFlowWithStepsResponse(result.value) });
    } catch (e) { next(e); }
  }

  async getFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId } = FlowParamsSchema.parse(req.params);
      const result = this.svc.getFlow(flowId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toFlowWithStepsResponse(result.value) });
    } catch (e) { next(e); }
  }

  async listFlowsByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserQuerySchema.parse(req.query);
      const result = this.svc.listFlowsByUser(userId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: result.value.map(toFlowResponse) });
    } catch (e) { next(e); }
  }

  async startFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId } = FlowParamsSchema.parse(req.params);
      const result = this.svc.startFlow(flowId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toFlowResponse(result.value) });
    } catch (e) { next(e); }
  }

  async abandonFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId } = FlowParamsSchema.parse(req.params);
      const result = this.svc.abandonFlow(flowId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toFlowResponse(result.value) });
    } catch (e) { next(e); }
  }

  async addStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId } = FlowParamsSchema.parse(req.params);
      const body = AddStepBodySchema.parse(req.body);
      const result = this.svc.addStep(flowId, body);
      if (isErr(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toStepResponse(result.value) });
    } catch (e) { next(e); }
  }

  async startStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId, stepId } = StepParamsSchema.parse(req.params);
      const result = this.svc.startStep(flowId, stepId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toStepResponse(result.value) });
    } catch (e) { next(e); }
  }

  async completeStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId, stepId } = StepParamsSchema.parse(req.params);
      const result = this.svc.completeStep(flowId, stepId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toStepResponse(result.value) });
    } catch (e) { next(e); }
  }

  async skipStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId, stepId } = StepParamsSchema.parse(req.params);
      const result = this.svc.skipStep(flowId, stepId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toStepResponse(result.value) });
    } catch (e) { next(e); }
  }

  async getChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flowId } = FlowParamsSchema.parse(req.params);
      const result = this.svc.getChecklist(flowId);
      if (isErr(result)) { next(result.error); return; }
      res.status(200).json({ success: true, data: toChecklistResponse(result.value) });
    } catch (e) { next(e); }
  }
}
