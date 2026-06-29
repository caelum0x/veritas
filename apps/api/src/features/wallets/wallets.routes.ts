// Wallets feature routes: mounts CRUD endpoints and wires the feature service from deps.
import { type Router } from "express";
import { TOKENS } from "@veritas/container";
import type { Container } from "@veritas/container";
import type { WalletService } from "@veritas/services";
import type { Logger } from "@veritas/core";
import { authenticate } from "../../middleware/auth.js";
import { parsePagination } from "../../middleware/pagination.js";
import { WalletsFeatureService } from "./wallets.service.js";
import { makeWalletsController } from "./wallets.controller.js";

export interface WalletsDepsContainer {
  readonly container: Container;
}

export function registerWalletsRoutes(
  router: Router,
  deps: WalletsDepsContainer,
): void {
  const walletService = deps.container.resolve(TOKENS.WalletSvc) as WalletService;
  const logger = deps.container.resolve(TOKENS.Logger) as Logger;

  const featureService = new WalletsFeatureService({ walletService, logger });
  const ctrl = makeWalletsController(featureService);

  router.use(authenticate);

  router.get("/", parsePagination, ctrl.listWallets);
  router.post("/", ctrl.createWallet);
  router.get("/:id", ctrl.getWallet);
  router.patch("/:id", ctrl.updateWallet);
  router.delete("/:id", ctrl.deleteWallet);
}
