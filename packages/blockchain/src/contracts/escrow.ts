// CAP escrow contract reader interface for on-chain dispute/settlement state

import { ok, err, type Result, type AppError } from "@veritas/core";
import type { Provider } from "../provider.js";
import type { EvmAddress } from "../address.js";
import { unbrand } from "@veritas/core";
import type { UsdcBaseUnits } from "../units.js";
import type { HexString } from "../hex.js";
import { hexToBigInt, padHex, concatHex } from "../hex.js";
import { ContractCallError } from "../errors.js";

// Function selectors (keccak256 first 4 bytes)
const SEL_GET_ESCROW: HexString = "0x1a2d4b9e"; // getEscrow(bytes32)
const SEL_BALANCE_OF: HexString = "0x70a08231"; // balanceOf(address)
const SEL_IS_RELEASED: HexString = "0xd0e30db0"; // isReleased(bytes32) — placeholder
const SEL_DISPUTE_STATUS: HexString = "0x5c60da1b"; // disputeStatus(bytes32) — placeholder

export type EscrowStatus = "open" | "released" | "refunded" | "disputed";

export interface EscrowState {
  readonly orderId: string;
  readonly buyer: EvmAddress;
  readonly seller: EvmAddress;
  readonly amount: UsdcBaseUnits;
  readonly status: EscrowStatus;
  readonly createdAt: bigint;
  readonly releasedAt: bigint | undefined;
}

function encodeBytes32Arg(value: string): HexString {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32));
  const hex = Array.from(padded)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}` as HexString;
}

function encodeAddressArg(address: EvmAddress): HexString {
  return padHex(`0x${unbrand(address).replace(/^0x/, "")}` as HexString, 32);
}

function decodeUint256(data: HexString, offset: number): bigint {
  const slotHex = data.slice(2 + offset * 64, 2 + (offset + 1) * 64);
  return BigInt(`0x${slotHex}`);
}

function decodeStatus(raw: bigint): EscrowStatus {
  switch (raw) {
    case 0n: return "open";
    case 1n: return "released";
    case 2n: return "refunded";
    case 3n: return "disputed";
    default: return "open";
  }
}

export interface EscrowReader {
  getEscrowBalance(escrowAddress: EvmAddress): Promise<Result<UsdcBaseUnits, AppError>>;
  getEscrowState(escrowAddress: EvmAddress, orderId: string): Promise<Result<EscrowState, AppError>>;
  isOrderReleased(escrowAddress: EvmAddress, orderId: string): Promise<Result<boolean, AppError>>;
  getDisputeStatus(escrowAddress: EvmAddress, orderId: string): Promise<Result<EscrowStatus, AppError>>;
}

export function createEscrowReader(provider: Provider, usdcAddress: EvmAddress): EscrowReader {
  async function callContract(
    to: EvmAddress,
    data: HexString
  ): Promise<Result<HexString, AppError>> {
    try {
      const result = await provider.call({ to: unbrand(to), data }, "latest");
      return ok(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return err(new ContractCallError(message, { cause: e instanceof Error ? e : undefined }));
    }
  }

  return {
    async getEscrowBalance(escrowAddress: EvmAddress): Promise<Result<UsdcBaseUnits, AppError>> {
      const data = concatHex([SEL_BALANCE_OF, encodeAddressArg(escrowAddress)]);
      const result = await callContract(usdcAddress, data);
      if (!result.ok) return result;
      const raw = result.value;
      if (!raw || raw === "0x") return ok(0n);
      return ok(hexToBigInt(raw));
    },

    async getEscrowState(
      escrowAddress: EvmAddress,
      orderId: string
    ): Promise<Result<EscrowState, AppError>> {
      const orderIdArg = encodeBytes32Arg(orderId);
      const data = concatHex([SEL_GET_ESCROW, orderIdArg]);
      const result = await callContract(escrowAddress, data);
      if (!result.ok) return result;

      const raw = result.value;
      if (!raw || raw.length < 2 + 7 * 64) {
        return err(new ContractCallError("getEscrow returned insufficient data"));
      }

      // Decode packed tuple: buyer(address), seller(address), amount(uint256), status(uint8), createdAt(uint256), releasedAt(uint256)
      const buyerRaw = `0x${raw.slice(2 + 0 * 64 + 24, 2 + 0 * 64 + 64)}` as EvmAddress;
      const sellerRaw = `0x${raw.slice(2 + 1 * 64 + 24, 2 + 1 * 64 + 64)}` as EvmAddress;
      const amount = decodeUint256(raw, 2);
      const statusRaw = decodeUint256(raw, 3);
      const createdAt = decodeUint256(raw, 4);
      const releasedAtRaw = decodeUint256(raw, 5);

      const state: EscrowState = {
        orderId,
        buyer: buyerRaw,
        seller: sellerRaw,
        amount,
        status: decodeStatus(statusRaw),
        createdAt,
        releasedAt: releasedAtRaw === 0n ? undefined : releasedAtRaw,
      };
      return ok(state);
    },

    async isOrderReleased(
      escrowAddress: EvmAddress,
      orderId: string
    ): Promise<Result<boolean, AppError>> {
      const orderIdArg = encodeBytes32Arg(orderId);
      const data = concatHex([SEL_IS_RELEASED, orderIdArg]);
      const result = await callContract(escrowAddress, data);
      if (!result.ok) return result;
      const raw = result.value;
      if (!raw || raw === "0x") return ok(false);
      return ok(hexToBigInt(raw) !== 0n);
    },

    async getDisputeStatus(
      escrowAddress: EvmAddress,
      orderId: string
    ): Promise<Result<EscrowStatus, AppError>> {
      const orderIdArg = encodeBytes32Arg(orderId);
      const data = concatHex([SEL_DISPUTE_STATUS, orderIdArg]);
      const result = await callContract(escrowAddress, data);
      if (!result.ok) return result;
      const raw = result.value;
      if (!raw || raw === "0x") return ok("open" as EscrowStatus);
      return ok(decodeStatus(hexToBigInt(raw)));
    },
  };
}
