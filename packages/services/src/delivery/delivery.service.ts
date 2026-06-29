// Delivery application service: create, retrieve, and complete delivery records for paid orders.
import {
  ok,
  err,
  isErr,
  epochToIso,
  contentHash,
  type Result,
  type Logger,
  type Page,
  type PageRequest,
  toPageRequest,
} from "@veritas/core";
import type { Delivery, DeliveryStatus } from "@veritas/contracts";
import type { DeliveryRepository } from "@veritas/persistence";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  PreconditionFailedError,
  ServiceValidationError,
  DuplicateResourceError,
} from "../errors.js";

/** Input to open a delivery record for a paid order. */
export interface CreateDeliveryInput {
  readonly orderId: string;
  readonly reportId?: string | null;
}

/** Input to complete a delivery with the report artifact. */
export interface CompleteDeliveryInput {
  readonly reportId: string;
  readonly reportPayload: unknown;
}

/** Output shape mirrors the persisted Delivery entity. */
export type DeliveryOutput = Delivery;

/** Application service managing fulfilled report deliveries for paid orders. */
export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * Open a PENDING delivery record tied to a paid order.
   * Only one delivery per order is allowed.
   */
  async open(
    ctx: ServiceContext,
    input: CreateDeliveryInput,
  ): Promise<Result<DeliveryOutput, DuplicateResourceError | ServiceValidationError>> {
    const log = this.logger.child({ traceId: ctx.traceId, op: "delivery.open" });

    const result = await this.repo.create({
      orderId: input.orderId,
      reportId: input.reportId ?? null,
    });

    if (isErr(result)) {
      log.warn("Duplicate delivery attempt", { orderId: input.orderId });
      return err(
        new DuplicateResourceError("Delivery", "orderId", input.orderId),
      );
    }

    log.info("Delivery opened", { deliveryId: result.value.id, orderId: input.orderId });
    return ok(result.value);
  }

  /** Retrieve a delivery by its id. */
  async getById(
    ctx: ServiceContext,
    deliveryId: string,
  ): Promise<Result<DeliveryOutput, ResourceNotFoundError>> {
    const result = await this.repo.findById(deliveryId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Delivery", deliveryId));
    }
    return ok(result.value);
  }

  /** Retrieve the delivery record for a given order id. */
  async getByOrderId(
    ctx: ServiceContext,
    orderId: string,
  ): Promise<Result<DeliveryOutput, ResourceNotFoundError>> {
    const result = await this.repo.findByOrderId(orderId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Delivery", `order:${orderId}`));
    }
    return ok(result.value);
  }

  /** List deliveries with optional status filter and cursor pagination. */
  async list(
    ctx: ServiceContext,
    filters: { orderId?: string; status?: DeliveryStatus },
    page?: { limit?: number; cursor?: string },
  ): Promise<Page<DeliveryOutput>> {
    return this.repo.list(filters, toPageRequest(page ?? {}));
  }

  /**
   * Mark a PENDING delivery as DELIVERED, attaching the report artifact.
   * Computes and stores a content hash of the report payload for provenance.
   */
  async complete(
    ctx: ServiceContext,
    deliveryId: string,
    input: CompleteDeliveryInput,
  ): Promise<Result<DeliveryOutput, ResourceNotFoundError | PreconditionFailedError>> {
    const log = this.logger.child({ traceId: ctx.traceId, op: "delivery.complete" });

    const found = await this.repo.findById(deliveryId);
    if (isErr(found)) {
      return err(new ResourceNotFoundError("Delivery", deliveryId));
    }

    const delivery = found.value;
    if (delivery.status !== "PENDING") {
      return err(
        new PreconditionFailedError(
          `Delivery ${deliveryId} is not PENDING (current: ${delivery.status}).`,
        ),
      );
    }

    const hash = contentHash(input.reportPayload);
    const deliveredAt = epochToIso(Date.now());

    const updated = await this.repo.update(deliveryId, {
      reportId: input.reportId,
      status: "DELIVERED" as DeliveryStatus,
      contentHash: hash,
      deliveredAt,
    });

    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Delivery", deliveryId));
    }

    log.info("Delivery completed", { deliveryId, reportId: input.reportId });
    return ok(updated.value);
  }

  /**
   * Mark a PENDING delivery as FAILED (e.g. after job failure or timeout).
   */
  async fail(
    ctx: ServiceContext,
    deliveryId: string,
  ): Promise<Result<DeliveryOutput, ResourceNotFoundError | PreconditionFailedError>> {
    const log = this.logger.child({ traceId: ctx.traceId, op: "delivery.fail" });

    const found = await this.repo.findById(deliveryId);
    if (isErr(found)) {
      return err(new ResourceNotFoundError("Delivery", deliveryId));
    }

    const delivery = found.value;
    if (delivery.status !== "PENDING") {
      return err(
        new PreconditionFailedError(
          `Delivery ${deliveryId} cannot be failed in status ${delivery.status}.`,
        ),
      );
    }

    const updated = await this.repo.update(deliveryId, {
      status: "FAILED" as DeliveryStatus,
    });

    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Delivery", deliveryId));
    }

    log.warn("Delivery marked FAILED", { deliveryId });
    return ok(updated.value);
  }
}
