// Wei and USDC unit conversion math using BigInt

export type Wei = bigint;
export type UsdcBaseUnits = bigint;

export const ETH_DECIMALS = 18;
export const USDC_DECIMALS = 6;

const WEI_PER_ETH = 10n ** BigInt(ETH_DECIMALS);
const BASE_UNITS_PER_USDC = 10n ** BigInt(USDC_DECIMALS);

export function ethToWei(eth: number): Wei {
  const parts = eth.toFixed(ETH_DECIMALS).split(".");
  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  const paddedFraction = fraction.padEnd(ETH_DECIMALS, "0").slice(0, ETH_DECIMALS);
  return BigInt(whole) * WEI_PER_ETH + BigInt(paddedFraction);
}

export function weiToEth(wei: Wei): number {
  const whole = wei / WEI_PER_ETH;
  const remainder = wei % WEI_PER_ETH;
  return Number(whole) + Number(remainder) / Number(WEI_PER_ETH);
}

export function usdcToBaseUnits(usdc: number): UsdcBaseUnits {
  const parts = usdc.toFixed(USDC_DECIMALS).split(".");
  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  const paddedFraction = fraction.padEnd(USDC_DECIMALS, "0").slice(0, USDC_DECIMALS);
  return BigInt(whole) * BASE_UNITS_PER_USDC + BigInt(paddedFraction);
}

export function baseUnitsToUsdc(units: UsdcBaseUnits): number {
  const whole = units / BASE_UNITS_PER_USDC;
  const remainder = units % BASE_UNITS_PER_USDC;
  return Number(whole) + Number(remainder) / Number(BASE_UNITS_PER_USDC);
}

export function formatWei(wei: Wei, precision = 6): string {
  const eth = weiToEth(wei);
  return `${eth.toFixed(precision)} ETH`;
}

export function formatBaseUnits(units: UsdcBaseUnits, precision = 2): string {
  const usdc = baseUnitsToUsdc(units);
  return `${usdc.toFixed(precision)} USDC`;
}

export function weiToGwei(wei: Wei): bigint {
  return wei / 1_000_000_000n;
}

export function gweiToWei(gwei: bigint): Wei {
  return gwei * 1_000_000_000n;
}
