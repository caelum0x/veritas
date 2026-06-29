// Plan controller handlers for CRUD operations on billing plans.
import type { Request, Response, NextFunction } from "express";
import { apiSuccess, apiPage } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respond } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import { validate } from "../middleware/validate.js";
import { getPagination } from "../middleware/pagination.js";
import {
  listPlansQuerySchema,
  getPlanParamsSchema,
  createPlanBodySchema,
  updatePlanParamsSchema,
  updatePlanBodySchema,
  deletePlanParamsSchema,
} from "../validators/plan.validator.js";

export const listPlans = [
  validate({ query: listPlansQuerySchema }),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const services = req.app.locals.container;
    const planService = services.planService;
    const pageReq = getPagination(req);
    const { active, interval } = req.query as Record<string, string | undefined>;

    const result = await planService.listPlans({
      ...pageReq,
      active: active === undefined ? undefined : active === "true",
      interval,
    });

    if (result.ok) {
      respond(res, 200, apiPage(result.value.items, result.value.meta));
    } else {
      throw toHttpError(result.error);
    }
  }),
];

export const getPlan = [
  validate({ params: getPlanParamsSchema }),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const services = req.app.locals.container;
    const planService = services.planService;

    const result = await planService.getPlan(req.params.id);
    if (result.ok) {
      respond(res, 200, apiSuccess(result.value));
    } else {
      throw toHttpError(result.error);
    }
  }),
];

export const createPlan = [
  validate({ body: createPlanBodySchema }),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const services = req.app.locals.container;
    const planService = services.planService;

    const result = await planService.createPlan(req.body);
    if (result.ok) {
      respond(res, 201, apiSuccess(result.value));
    } else {
      throw toHttpError(result.error);
    }
  }),
];

export const updatePlan = [
  validate({ params: updatePlanParamsSchema, body: updatePlanBodySchema }),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const services = req.app.locals.container;
    const planService = services.planService;

    const result = await planService.updatePlan(req.params.id, req.body);
    if (result.ok) {
      respond(res, 200, apiSuccess(result.value));
    } else {
      throw toHttpError(result.error);
    }
  }),
];

export const deletePlan = [
  validate({ params: deletePlanParamsSchema }),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const services = req.app.locals.container;
    const planService = services.planService;

    const result = await planService.deletePlan(req.params.id);
    if (result.ok) {
      respond(res, 204, null);
    } else {
      throw toHttpError(result.error);
    }
  }),
];
