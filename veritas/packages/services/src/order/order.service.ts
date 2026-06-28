// Order application service: create, retrieve, list, and status-transition orders.
import {
  ok,
  err,
  isErr,
  newId,
  epochToIso,
  OrderStatus,
  type Result,
  type Logger,
  type Page,
  type PageRequest,
  toPageRequest,
} from "@veritas/core";
import type { Order } from "@veritas/contracts";
import type { OrderRepository } from "@veritas/persistence";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  PreconditionFailedError,
  ServiceValidationError,
} from "../errors.js";
import {
  type CreateOrderInput,
  type UpdateOrderInput,
  type ListOrdersInput,
  type OrderOutput,
  toOrderOutput,
} from "./order.dto.js";

/** Application service for managing paid USDC orders. */
export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly logger: Logger,
  ) {}

  /** Create a new order in PENDING status. */
  async create(
    ctx: ServiceContext,
    input: CreateOrderInput,
  ): Promise<Result<OrderOutput, ServiceValidationError>> {
    const log = this.logger.child({ traceId: ctx.traceId, op: "order.create" });
    const now = epochToIso(Date.now());
    const id = newId("order");

    const result = await this.repo.create({
      ...input,
      negotiationId: input.negotiationId ?? null,
    });

    if (isErr(result)) {
      log.error("Failed to persist order", { error: String(result.error) });
      return err(new ServiceValidationError("Failed to create order."));
    }

    log.info("Order created", { orderId: id });
    return ok(toOrderOutput(result.value));
  }

  /** Retrieve a single order by its id. */
  async getById(
    ctx: ServiceContext,
    orderId: string,
  ): Promise<Result<OrderOutput, ResourceNotFoundError>> {
    const result = await this.repo.findById(orderId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }
    return ok(toOrderOutput(result.value));
  }

  /** List orders with optional filters and cursor-based pagination. */
  async list(
    ctx: ServiceContext,
    input: ListOrdersInput,
  ): Promise<Result<Page<OrderOutput>>> {
    const { buyerAgentId, serviceId, negotiationId, status, limit, cursor } =
      input;

    let result: Result<Page<Order>>;

    if (buyerAgentId !== undefined) {
      result = await this.repo.findByBuyerAgentId(buyerAgentId, {
        page: toPageRequest({ limit, cursor }),
      });
    } else if (serviceId !== undefined) {
      result = await this.repo.findByServiceId(serviceId, {
        page: toPageRequest({ limit, cursor }),
      });
    } else if (negotiationId !== undefined) {
      result = await this.repo.findByNegotiationId(negotiationId, {
        page: toPageRequest({ limit, cursor }),
      });
    } else if (status !== undefined) {
      result = await this.repo.findByStatus(status, {
        page: toPageRequest({ limit, cursor }),
      });
    } else {
      result = await this.repo.list({
        page: toPageRequest({ limit, cursor }),
      });
    }

    if (isErr(result)) {
      return result;
    }

    const page = result.value;
    return ok({
      ...page,
      items: page.items.map(toOrderOutput),
    });
  }

  /** Transition order to PAID status (called after on-chain settlement confirmation). */
  async markPaid(
    ctx: ServiceContext,
    orderId: string,
  ): Promise<Result<OrderOutput, ResourceNotFoundError | PreconditionFailedError>> {
    const found = await this.repo.findById(orderId);
    if (isErr(found)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }

    const order = found.value;
    if (order.status !== OrderStatus.PENDING) {
      return err(
        new PreconditionFailedError(
          `Order ${orderId} is not in PENDING status (current: ${order.status}).`,
        ),
      );
    }

    const updated = await this.repo.update(orderId, { status: OrderStatus.PAID });
    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }

    this.logger.child({ traceId: ctx.traceId }).info("Order marked PAID", { orderId });
    return ok(toOrderOutput(updated.value));
  }

  /** Transition order to FULFILLED status and link the completed job. */
  async markFulfilled(
    ctx: ServiceContext,
    orderId: string,
    jobId: string,
    settlementId?: string,
  ): Promise<Result<OrderOutput, ResourceNotFoundError | PreconditionFailedError>> {
    const found = await this.repo.findById(orderId);
    if (isErr(found)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }

    const order = found.value;
    if (order.status !== OrderStatus.PAID) {
      return err(
        new PreconditionFailedError(
          `Order ${orderId} must be PAID to fulfil (current: ${order.status}).`,
        ),
      );
    }

    const updateInput: UpdateOrderInput = {
      status: OrderStatus.FULFILLED,
      jobId,
      ...(settlementId !== undefined && { settlementId }),
    };

    const updated = await this.repo.update(orderId, updateInput);
    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }

    this.logger.child({ traceId: ctx.traceId }).info("Order fulfilled", { orderId, jobId });
    return ok(toOrderOutput(updated.value));
  }

  /** Cancel a PENDING order. */
  async cancel(
    ctx: ServiceContext,
    orderId: string,
  ): Promise<Result<OrderOutput, ResourceNotFoundError | PreconditionFailedError>> {
    const found = await this.repo.findById(orderId);
    if (isErr(found)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }

    const order = found.value;
    const cancellable: string[] = [OrderStatus.PENDING];
    if (!cancellable.includes(order.status)) {
      return err(
        new PreconditionFailedError(
          `Order ${orderId} cannot be cancelled in status ${order.status}.`,
        ),
      );
    }

    const updated = await this.repo.update(orderId, { status: OrderStatus.CANCELLED });
    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Order", orderId));
    }

    this.logger.child({ traceId: ctx.traceId }).info("Order cancelled", { orderId });
    return ok(toOrderOutput(updated.value));
  }
}
