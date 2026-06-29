// Public surface of @veritas/verifiers-crypto.

export * from "./types.js";
export * from "./errors.js";
export * from "./rules.js";
export * from "./scoring.js";

export { CryptoVerifier, createCryptoVerifier } from "./verifier.js";
export {
  extractEvmHashes,
  extractBtcTxIds,
  extractCryptoSymbols,
  canHandleCryptoClaim,
  cryptoRelevanceScore,
} from "./matcher.js";

// Source ports + mocks.
export type { PriceFeedPort, PriceRecord, PriceCandle } from "./sources/price-feed.js";
export { MockPriceFeed, createMockPriceFeed } from "./sources/price-feed.js";

// Real, network-backed price feed (CoinGecko, keyless).
export { CoinGeckoPriceFeed, createCoinGeckoPriceFeed } from "./sources/coingecko-price-feed.js";
export type { CoinGeckoPriceFeedOptions } from "./sources/coingecko-price-feed.js";
