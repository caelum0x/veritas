// Subscription application service: use-cases for managing organization billing subscriptions.
import { ok, err, isOk } from "@veritas/core";
import type { Result, AppError, Page } from "@veritas/core";
import type { Subscription } from "@veritas/contracts";
import type { SubscriptionRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  DuplicateResourceError,
  PreconditionFailedError,
} from "../errors.js";
import { serviceCall } from "../result.js";
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListSubscriptionsInput,
  CancelSubscriptionInput,
  SubscriptionOutput,
} from "./subscription.dto.js";
import { toSubscriptionOutput } from "./subscription.dto.js";

/** Dependencies required by SubscriptionService. */
export interface SubscriptionServiceDeps extends BaseServiceDeps {
  readonly subscriptionRepo: SubscriptionRepository;
}

/** Application service for managing organization subscriptions. */
export class SubscriptionService extends BaseService {
  private readonly subscriptionRepo: SubscriptionRepository;

  constructor(deps: SubscriptionServiceDeps) {
    super(deps);
    this.subscriptionRepo = deps.subscriptionRepo;
  }

  /** Enroll an organization in a billing plan, creating a new subscription. */
  async create(
    ctx: ServiceContext,
    input: CreateSubscriptionInput,
  ): Promise<Result<SubscriptionOutput, AppError>> {
    this.log(ctx, "info", "subscription.create", {
      organizationId: input.organizationId,
      planId: input.planId,
    });
    return serviceCall(async () => {
      const activeCheck = await this.subscriptionRepo.findActiveByOrganizationId(
        input.organizationId,
      );
      if (isOk(activeCheck)) {
        throw new DuplicateResourceError(
          "Subscription",
          "organizationId",
          input.organizationId,
        );
      }
      const result = await this.subscriptionRepo.create(input);
      if (!isOk(result)) throw result.error;
      return toSubscriptionOutput(result.value);
    });
  }

  /** Retrieve a single subscription by its opaque ID. */
  async getById(
    ctx: ServiceContext,
    subscriptionId: string,
  ): Promise<Result<SubscriptionOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.subscriptionRepo.findById(subscriptionId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Subscription", subscriptionId);
      }
      return toSubscriptionOutput(result.value);
    });
  }

  /** Retrieve the currently active subscription for an organization. */
  async getActiveByOrganization(
    ctx: ServiceContext,
    organizationId: string,
  ): Promise<Result<SubscriptionOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.subscriptionRepo.findActiveByOrganizationId(organizationId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError(
          "Subscription",
          `active for organization:${organizationId}`,
        );
      }
      return toSubscriptionOutput(result.value);
    });
  }

  /** List subscriptions with optional filtering by organization, plan, or status. */
  async list(
    ctx: ServiceContext,
    input: ListSubscriptionsInput,
  ): Promise<Result<Page<SubscriptionOutput>, AppError>> {
    return serviceCall(async () => {
      const page = await this.subscriptionRepo.list(
        {
          organizationId: input.orgId,
          planId: input.planId,
          status: input.status,
        },
        { cursor: input.cursor, limit: input.limit ?? 20 },
      );
      return {
        ...page,
        items: page.items.map(toSubscriptionOutput),
      };
    });
  }

  /** Apply a partial update to a subscription (e.g. change plan or renew period). */
  async update(
    ctx: ServiceContext,
    subscriptionId: string,
    input: UpdateSubscriptionInput,
  ): Promise<Result<SubscriptionOutput, AppError>> {
    this.log(ctx, "info", "subscription.update", { subscriptionId });
    return serviceCall(async () => {
      const existing = await this.subscriptionRepo.findById(subscriptionId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Subscription", subscriptionId);
      }
      const result = await this.subscriptionRepo.update(subscriptionId, input);
      if (!isOk(result)) throw result.error;
      return toSubscriptionOutput(result.value);
    });
  }

  /** Schedule or immediately cancel a subscription. */
  async cancel(
    ctx: ServiceContext,
    input: CancelSubscriptionInput,
  ): Promise<Result<SubscriptionOutput, AppError>> {
    this.log(ctx, "info", "subscription.cancel", {
      subscriptionId: input.subscriptionId,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    });
    return serviceCall(async () => {
      const existing = await this.subscriptionRepo.findById(input.subscriptionId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Subscription", input.subscriptionId);
      }
      const current = existing.value;
      if (
        current.status === "CANCELLED" ||
        current.status === "EXPIRED"
      ) {
        throw new PreconditionFailedError(
          `Subscription is already ${current.status.toLowerCase()} and cannot be cancelled.`,
        );
      }
      const now = this.now();
      const updateDto = input.cancelAtPeriodEnd
        ? { cancelAtPeriodEnd: true }
        : { status: "CANCELLED" as const, cancelledAt: now, cancelAtPeriodEnd: false };

      const result = await this.subscriptionRepo.update(input.subscriptionId, updateDto);
      if (!isOk(result)) throw result.error;
      return toSubscriptionOutput(result.value);
    });
  }

  /** Resume a subscription that was scheduled for cancellation at period end. */
  async resume(
    ctx: ServiceContext,
    subscriptionId: string,
  ): Promise<Result<SubscriptionOutput, AppError>> {
    this.log(ctx, "info", "subscription.resume", { subscriptionId });
    return serviceCall(async () => {
      const existing = await this.subscriptionRepo.findById(subscriptionId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Subscription", subscriptionId);
      }
      if (!existing.value.cancelAtPeriodEnd) {
        throw new PreconditionFailedError(
          "Subscription is not scheduled for cancellation; nothing to resume.",
        );
      }
      const result = await this.subscriptionRepo.update(subscriptionId, {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      });
      if (!isOk(result)) throw result.error;
      return toSubscriptionOutput(result.value);
    });
  }

  /** Delete a cancelled or expired subscription record permanently. */
  async delete(
    ctx: ServiceContext,
    subscriptionId: string,
  ): Promise<Result<void, AppError>> {
    this.log(ctx, "info", "subscription.delete", { subscriptionId });
    return serviceCall(async () => {
      const existing = await this.subscriptionRepo.findById(subscriptionId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Subscription", subscriptionId);
      }
      const status = existing.value.status;
      if (status !== "CANCELLED" && status !== "EXPIRED") {
        throw new PreconditionFailedError(
          "Only CANCELLED or EXPIRED subscriptions can be deleted.",
        );
      }
      const result = await this.subscriptionRepo.delete(subscriptionId);
      if (!isOk(result)) throw result.error;
      return undefined;
    });
  }
}
