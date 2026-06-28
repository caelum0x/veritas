// Orchestrates onboarding flows and steps using @veritas/onboarding domain functions.
import {
  type OnboardingFlow,
  type OnboardingStep,
  type Checklist,
  makeFlow,
  makeStep,
  startFlow,
  abandonFlow,
  addStepToFlow,
  replaceStep,
  completeStep,
  skipStep,
  startStep,
  checkFlowCompletion,
  buildChecklist,
} from "@veritas/onboarding";
import { ok, err, type Result } from "@veritas/core";
import { NotFoundError, ConflictError } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { CreateFlowBody, AddStepBody } from "./onboarding.schema.js";

/** Minimal in-memory store scoped to the service; replace with a real repo in production. */
class InMemoryFlowStore {
  private readonly flows = new Map<string, OnboardingFlow>();

  save(flow: OnboardingFlow): void {
    this.flows.set(flow.id, flow);
  }

  findById(id: string): OnboardingFlow | undefined {
    return this.flows.get(id);
  }

  findByUserId(userId: string): OnboardingFlow[] {
    return Array.from(this.flows.values()).filter((f) => f.userId === userId);
  }
}

export class OnboardingService {
  private readonly store = new InMemoryFlowStore();

  constructor(private readonly logger: Logger) {}

  createFlow(body: CreateFlowBody): Result<OnboardingFlow, Error> {
    const now = new Date().toISOString();
    const flow = makeFlow(
      {
        userId: body.userId,
        organizationId: body.organizationId,
        name: body.name,
        description: body.description,
        templateId: body.templateId,
        metadata: body.metadata,
      },
      now,
    );
    this.store.save(flow);
    this.logger.info("onboarding.flow.created", { flowId: flow.id, userId: flow.userId });
    return ok(flow);
  }

  getFlow(flowId: string): Result<OnboardingFlow, Error> {
    const flow = this.store.findById(flowId);
    if (!flow) return err(new NotFoundError(`Flow not found: ${flowId}`));
    return ok(flow);
  }

  listFlowsByUser(userId: string): Result<OnboardingFlow[], Error> {
    return ok(this.store.findByUserId(userId));
  }

  startFlow(flowId: string): Result<OnboardingFlow, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    const now = new Date().toISOString();
    const updated = startFlow(found, now);
    this.store.save(updated);
    this.logger.info("onboarding.flow.started", { flowId });
    return ok(updated);
  }

  abandonFlow(flowId: string): Result<OnboardingFlow, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    if (found.status === "completed") {
      return err(new ConflictError(`Flow ${flowId} is already completed`));
    }
    const now = new Date().toISOString();
    const updated = abandonFlow(found, now);
    this.store.save(updated);
    this.logger.info("onboarding.flow.abandoned", { flowId });
    return ok(updated);
  }

  addStep(flowId: string, body: AddStepBody): Result<OnboardingStep, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    const now = new Date().toISOString();
    const step = makeStep({
      flowId,
      kind: body.kind,
      title: body.title,
      description: body.description,
      order: body.order,
      required: body.required,
      skippable: body.skippable,
      metadata: body.metadata,
    });
    const updated = addStepToFlow(found, step, now);
    this.store.save(updated);
    this.logger.info("onboarding.step.added", { flowId, stepId: step.id });
    return ok(step);
  }

  startStep(flowId: string, stepId: string): Result<OnboardingStep, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    const step = found.steps.find((s) => s.id === stepId);
    if (!step) return err(new NotFoundError(`Step not found: ${stepId}`));
    const now = new Date().toISOString();
    const updatedStep = startStep(step);
    const updatedFlow = replaceStep(found, updatedStep, now);
    this.store.save(updatedFlow);
    return ok(updatedStep);
  }

  completeStep(flowId: string, stepId: string): Result<OnboardingStep, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    const step = found.steps.find((s) => s.id === stepId);
    if (!step) return err(new NotFoundError(`Step not found: ${stepId}`));
    const now = new Date().toISOString();
    const updatedStep = completeStep(step, now);
    let updatedFlow = replaceStep(found, updatedStep, now);
    updatedFlow = checkFlowCompletion(updatedFlow, now);
    this.store.save(updatedFlow);
    this.logger.info("onboarding.step.completed", { flowId, stepId });
    return ok(updatedStep);
  }

  skipStep(flowId: string, stepId: string): Result<OnboardingStep, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    const step = found.steps.find((s) => s.id === stepId);
    if (!step) return err(new NotFoundError(`Step not found: ${stepId}`));
    if (!step.skippable) return err(new ConflictError(`Step ${stepId} is not skippable`));
    const now = new Date().toISOString();
    const updatedStep = skipStep(step);
    let updatedFlow = replaceStep(found, updatedStep, now);
    updatedFlow = checkFlowCompletion(updatedFlow, now);
    this.store.save(updatedFlow);
    this.logger.info("onboarding.step.skipped", { flowId, stepId });
    return ok(updatedStep);
  }

  getChecklist(flowId: string): Result<Checklist, Error> {
    const found = this.store.findById(flowId);
    if (!found) return err(new NotFoundError(`Flow not found: ${flowId}`));
    return ok(buildChecklist(found));
  }
}
