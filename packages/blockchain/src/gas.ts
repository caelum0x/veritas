// Gas estimation helpers using eth_estimateGas and eth_gasPrice

import { ok, err, type Result, type AppError, InternalError } from "@veritas/core";
import type { Provider, CallParams } from "./provider.js";
import type { Wei } from "./units.js";
import { GasEstimationError } from "./errors.js";
import { hexToBigInt, toHex } from "./hex.js";

export interface GasEstimate {
  readonly gasLimit: bigint;
  readonly gasPrice: Wei;
  readonly maxFeePerGas?: Wei;
  readonly maxPriorityFeePerGas?: Wei;
  readonly estimatedCostWei: Wei;
}

export interface FeeData {
  readonly gasPrice: Wei;
  readonly maxFeePerGas: Wei;
  readonly maxPriorityFeePerGas: Wei;
}

// 20% buffer multiplier applied to raw gas estimate
const GAS_BUFFER_NUMERATOR = 120n;
const GAS_BUFFER_DENOMINATOR = 100n;

function applyBuffer(gas: bigint): bigint {
  return (gas * GAS_BUFFER_NUMERATOR) / GAS_BUFFER_DENOMINATOR;
}

export async function estimateGas(
  provider: Provider,
  tx: CallParams
): Promise<Result<bigint, AppError>> {
  try {
    const params: Record<string, unknown> = { to: tx.to };
    if (tx.data !== undefined) params["data"] = tx.data;
    if (tx.from !== undefined) params["from"] = tx.from;
    if (tx.value !== undefined) params["value"] = toHex(tx.value);
    if (tx.gas !== undefined) params["gas"] = toHex(tx.gas);

    const raw = await provider.request<string>("eth_estimateGas", [params]);
    const gasLimit = applyBuffer(hexToBigInt(raw as `0x${string}`));
    return ok(gasLimit);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return err(new GasEstimationError(message, { cause: e instanceof Error ? e : undefined }));
  }
}

export async function getGasPrice(provider: Provider): Promise<Result<Wei, AppError>> {
  try {
    const raw = await provider.request<string>("eth_gasPrice");
    return ok(hexToBigInt(raw as `0x${string}`));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return err(new InternalError({ message: `eth_gasPrice failed: ${message}`, cause: e instanceof Error ? e : undefined }));
  }
}

export async function getFeeData(provider: Provider): Promise<Result<FeeData, AppError>> {
  try {
    const [gasPriceRaw, feeHistoryRaw] = await Promise.all([
      provider.request<string>("eth_gasPrice"),
      provider.request<{ baseFeePerGas: readonly string[] }>("eth_feeHistory", [
        1,
        "latest",
        [50],
      ]),
    ]);

    const gasPrice = hexToBigInt(gasPriceRaw as `0x${string}`);
    const baseFees = feeHistoryRaw?.baseFeePerGas;
    const latestBase =
      baseFees && baseFees.length > 0
        ? hexToBigInt(baseFees[baseFees.length - 1] as `0x${string}`)
        : gasPrice;
    const maxPriorityFeePerGas = 1_500_000_000n; // 1.5 gwei tip
    const maxFeePerGas = latestBase * 2n + maxPriorityFeePerGas;

    return ok({ gasPrice, maxFeePerGas, maxPriorityFeePerGas });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return err(new InternalError({ message: `getFeeData failed: ${message}`, cause: e instanceof Error ? e : undefined }));
  }
}

export async function buildGasEstimate(
  provider: Provider,
  tx: CallParams
): Promise<Result<GasEstimate, AppError>> {
  const [gasLimitResult, feeDataResult] = await Promise.all([
    estimateGas(provider, tx),
    getFeeData(provider),
  ]);

  if (!gasLimitResult.ok) return gasLimitResult;
  if (!feeDataResult.ok) return feeDataResult;

  const gasLimit = gasLimitResult.value;
  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = feeDataResult.value;
  const estimatedCostWei: Wei = gasLimit * maxFeePerGas;

  return ok({ gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, estimatedCostWei });
}
