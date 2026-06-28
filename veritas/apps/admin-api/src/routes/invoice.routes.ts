// Invoice admin routes — mount under /admin/invoices
import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller.js";

export function createInvoiceRouter(controller: InvoiceController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/:id/void", controller.voidInvoice);

  return router;
}
