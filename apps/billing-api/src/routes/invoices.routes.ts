// invoices.routes.ts: mount invoice generation and listing endpoints under /invoices.

import { Router } from "express";
import { InvoicesController } from "../controllers/invoices.controller.js";
import type { InvoiceGenerator } from "@veritas/billing";

export function invoicesRouter(invoiceGenerator: InvoiceGenerator): Router {
  const router = Router();
  const ctrl = new InvoicesController(invoiceGenerator);

  /** GET /invoices — list invoices (stub, returns empty page) */
  router.get("/", (req, res) => ctrl.list(req, res));

  /** POST /invoices/generate — generate a new invoice for a billing period */
  router.post("/generate", (req, res) => ctrl.generate(req, res));

  return router;
}
