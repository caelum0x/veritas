// USDC contract reader — fetch balances and allowances on Base chains

import { type Result, ok, err, InternalError, type AppError } from "@veritas/core";
import type { Provider } from "../provider.js";
import type { EvmAddress } from "../address.js";
import type { HexString } from "../hex.js";
import { encodeBalanceOf, encodeAllowance, decodeUint256 } from "../abi/encode.js";
import { baseUnitsToUsdc, type UsdcBaseUnits } from "../units.js";

/** Base mainnet USDC contract address */
export const USDC_ADDRESS_BASE_MAINNET =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;

/** Base Sepolia USDC contract address */
export const USDC_ADDRESS_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export interface UsdcBalance {
  readonly address: EvmAddress;
  readonly contractAddress: string;
  readonly baseUnits: UsdcBaseUnits;
  readonly usdc: number;
}

export interface UsdcAllowance {
  readonly owner: EvmAddress;
  readonly spender: EvmAddress;
  readonly contractAddress: string;
  readonly baseUnits: UsdcBaseUnits;
  readonly usdc: number;
}

async function ethCall(
  provider: Provider,
  contractAddress: string,
  data: HexString
): Promise<Result<HexString, AppError>> {
  try {
    const result = await provider.call({ to: contractAddress, data }, "latest");
    return ok(result);
  } catch (cause) {
    return err(
      new InternalError({
        message: "eth_call failed",
        cause: cause instanceof Error ? cause : new Error(String(cause)),
        details: { contractAddress, data },
      })
    );
  }
}

export async function getUsdcBalance(
  provider: Provider,
  account: EvmAddress,
  contractAddress: string = USDC_ADDRESS_BASE_MAINNET
): Promise<Result<UsdcBalance, AppError>> {
  const calldata = encodeBalanceOf(account as string);
  const callResult = await ethCall(provider, contractAddress, calldata);
  if (!callResult.ok) return err(callResult.error);

  const baseUnits = decodeUint256(callResult.value);
  return ok({
    address: account,
    contractAddress,
    baseUnits,
    usdc: baseUnitsToUsdc(baseUnits),
  });
}

export async function getUsdcAllowance(
  provider: Provider,
  owner: EvmAddress,
  spender: EvmAddress,
  contractAddress: string = USDC_ADDRESS_BASE_MAINNET
): Promise<Result<UsdcAllowance, AppError>> {
  const calldata = encodeAllowance(owner as string, spender as string);
  const callResult = await ethCall(provider, contractAddress, calldata);
  if (!callResult.ok) return err(callResult.error);

  const baseUnits = decodeUint256(callResult.value);
  return ok({
    owner,
    spender,
    contractAddress,
    baseUnits,
    usdc: baseUnitsToUsdc(baseUnits),
  });
}

export interface UsdcReader {
  getBalance(account: EvmAddress): Promise<Result<UsdcBalance, AppError>>;
  getAllowance(owner: EvmAddress, spender: EvmAddress): Promise<Result<UsdcAllowance, AppError>>;
}

export function createUsdcReader(
  provider: Provider,
  contractAddress: string = USDC_ADDRESS_BASE_MAINNET
): UsdcReader {
  return {
    getBalance: (account) => getUsdcBalance(provider, account, contractAddress),
    getAllowance: (owner, spender) => getUsdcAllowance(provider, owner, spender, contractAddress),
  };
}
