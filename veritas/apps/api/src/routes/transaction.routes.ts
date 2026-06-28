// Transaction route definitions: list and retrieve immutable transaction records.
import { Router } from "express";
import type { Container } from "@veritas/container";
import type { AppConfig } from "@veritas/config";
import {
  listTransactionsHandler,
  getTransactionHandler,
} from "../controllers/transaction.controller.js";

export function transactionRouter(_container: Container, _config: AppConfig): Router {
  const router = Router();

  router.get("/", ...listTransactionsHandler);
  router.get("/:id", ...getTransactionHandler);

  return router;
}
