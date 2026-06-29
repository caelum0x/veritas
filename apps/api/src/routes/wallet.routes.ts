// Wallet route definitions — mounts CRUD and deposit endpoints under /wallets.
import { Router } from "express";
import { listWallets, getWallet, createWallet, depositToWallet } from "../controllers/wallet.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { parsePagination } from "../middleware/pagination.js";

const router = Router();

router.use(requireAuth);

router.get("/", parsePagination, listWallets);
router.post("/", createWallet);
router.get("/:id", getWallet);
router.post("/:id/deposit", depositToWallet);

export { router as walletRouter };
