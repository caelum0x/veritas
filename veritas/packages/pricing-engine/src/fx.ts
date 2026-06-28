// FX conversion port — external rate providers plug in behind this interface.

import { type PriceMoney, priceMoney, type Currency } from "./types.js";
import { CurrencyMismatchError } from "./errors.js";

/** Port: retrieve the current exchange rate from `from` to `to`. */
export interface FxRateProvider {
  getRate(from: Currency, to: Currency): Promise<number>;
}

/** In-memory stub: always returns 1:1 (single-currency system). */
export class IdentityFxRateProvider implements FxRateProvider {
  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from !== to) {
      throw new CurrencyMismatchError(from, to);
    }
    return 1;
  }
}

/** Convert a PriceMoney to a target currency using the provided rate provider. */
export async function convertCurrency(
  money: PriceMoney,
  targetCurrency: Currency,
  provider: FxRateProvider,
): Promise<PriceMoney> {
  if (money.currency === targetCurrency) return money;
  const rate = await provider.getRate(money.currency, targetCurrency);
  // Scale by rate using integer arithmetic: multiply base units then truncate.
  const scaled = BigInt(Math.trunc(Number(money.amount.baseUnits) * rate));
  return priceMoney(
    (await import("@veritas/core")).Usdc.fromBaseUnits(scaled),
    targetCurrency,
  );
}
