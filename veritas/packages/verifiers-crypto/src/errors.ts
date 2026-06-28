// Crypto-domain-specific error types extending AppError hierarchy.

import { AppError, type AppErrorOptions, type ErrorCode } from "@veritas/core";

// Crypto-specific codes that fall back to the nearest platform code.
const TX_NOT_FOUND = "NOT_FOUND" satisfies ErrorCode;
const CONTRACT_UNVERIFIED = "UNAVAILABLE" satisfies ErrorCode;
const TOKEN_DATA_UNAVAILABLE = "UNAVAILABLE" satisfies ErrorCode;
const PRICE_FEED_STALE = "UNAVAILABLE" satisfies ErrorCode;
const UNSUPPORTED_CHAIN = "VALIDATION" satisfies ErrorCode;

/** Raised when a blockchain transaction cannot be found or retrieved. */
export class TxNotFoundError extends AppError {
  constructor(txHash: string, opts?: Partial<AppErrorOptions>) {
    super(TX_NOT_FOUND, 404, `Transaction not found: ${txHash}`, {
      ...opts,
      details: { ...(opts?.details ?? {}), txHash },
    });
    this.name = "TxNotFoundError";
  }
}

/** Raised when a smart contract cannot be verified or is unverified on-chain. */
export class ContractUnverifiedError extends AppError {
  constructor(address: string, opts?: Partial<AppErrorOptions>) {
    super(CONTRACT_UNVERIFIED, 503, `Contract source not verified: ${address}`, {
      ...opts,
      details: { ...(opts?.details ?? {}), address },
    });
    this.name = "ContractUnverifiedError";
  }
}

/** Raised when token metadata or price data cannot be retrieved. */
export class TokenDataUnavailableError extends AppError {
  constructor(symbol: string, opts?: Partial<AppErrorOptions>) {
    super(TOKEN_DATA_UNAVAILABLE, 503, `Token data unavailable for: ${symbol}`, {
      ...opts,
      details: { ...(opts?.details ?? {}), symbol },
    });
    this.name = "TokenDataUnavailableError";
  }
}

/** Raised when price feed returns stale or missing data. */
export class PriceFeedStaleError extends AppError {
  constructor(symbol: string, ageMs: number, opts?: Partial<AppErrorOptions>) {
    super(PRICE_FEED_STALE, 503, `Price feed stale for ${symbol} (age: ${ageMs}ms)`, {
      ...opts,
      details: { ...(opts?.details ?? {}), symbol, ageMs },
    });
    this.name = "PriceFeedStaleError";
  }
}

/** Raised when chain ID or network is not supported by the verifier. */
export class UnsupportedChainError extends AppError {
  constructor(chainId: number | string, opts?: Partial<AppErrorOptions>) {
    super(UNSUPPORTED_CHAIN, 422, `Chain not supported: ${chainId}`, {
      ...opts,
      details: { ...(opts?.details ?? {}), chainId },
    });
    this.name = "UnsupportedChainError";
  }
}
