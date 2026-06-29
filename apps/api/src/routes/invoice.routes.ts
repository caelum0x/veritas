// Invoice route definitions: list, get, void, and pay invoices.
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { parsePagination } from "../middleware/pagination.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  listInvoices,
  getInvoice,
  voidInvoice,
  payInvoice,
} from "../controllers/invoice.controller.js";
import {
  listInvoicesQuerySchema,
  getInvoiceParamsSchema,
  voidInvoiceParamsSchema,
  payInvoiceParamsSchema,
  payInvoiceBodySchema,
} from "../validators/invoice.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  parsePagination,
  validateQuery(listInvoicesQuerySchema),
  listInvoices
);

router.get(
  "/:id",
  validateParams(getInvoiceParamsSchema),
  getInvoice
);

router.post(
  "/:id/void",
  validateParams(voidInvoiceParamsSchema),
  voidInvoice
);

router.post(
  "/:id/pay",
  validateParams(payInvoiceParamsSchema),
  validateBody(payInvoiceBodySchema),
  payInvoice
);

export { router as invoiceRouter };
