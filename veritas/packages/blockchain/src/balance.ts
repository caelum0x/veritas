// ERC20 balanceOf reader using ABI-encoded eth_call

import { ok, err, type Result, type AppError, InternalError } from "@veritas/core";
import type { Provider } from "./provider.js";
import type { EvmAddress } from "./address.js";
import { unbrand } from "@veritas/core";
import type { UsdcBaseUnits } from "./units.js";
import type { HexString } from "./hex.js";
import { hexToBigInt, padHex, concatHex } from "./hex.js";
import { ContractCallError } from "./errors.js";

// balanceOf(address) selector: keccak256("balanceOf(address)")[0:4]
const BALANCE_OF_SELECTOR: HexString = "0x70a08231";

function encodeBalanceOfCall(owner: EvmAddress): HexString {
  const paddedAddr = padHex(`0x${unbrand(owner).replace(/^0x/, "")}` as HexString, 32);
  return concatHex([BALANCE_OF_SELECTOR, paddedAddr]);
}

export async function erc20BalanceOf(
  provider: Provider,
  tokenAddress: EvmAddress,
  ownerAddress: EvmAddress
): Promise<Result<bigint, AppError>> {
  const data = encodeBalanceOfCall(ownerAddress);
  try {
    const raw = await provider.call(
      { to: unbrand(tokenAddress), data },
      "latest"
    );
    if (!raw || raw === "0x") {
      return ok(0n);
    }
    return ok(hexToBigInt(raw as HexString));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return err(new ContractCallError(`balanceOf failed: ${message}`, { cause: e instanceof Error ? e : undefined }));
  }
}

export async function usdcBalanceOf(
  provider: Provider,
  usdcAddress: EvmAddress,
  ownerAddress: EvmAddress
): Promise<Result<UsdcBaseUnits, AppError>> {
  return erc20BalanceOf(provider, usdcAddress, ownerAddress);
}

export async function ethBalanceOf(
  provider: Provider,
  address: EvmAddress
): Promise<Result<bigint, AppError>> {
  try {
    const balance = await provider.getBalance(unbrand(address), "latest");
    return ok(balance);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return err(new InternalError({ message: `eth_getBalance failed: ${message}`, cause: e instanceof Error ? e : undefined }));
  }
}
