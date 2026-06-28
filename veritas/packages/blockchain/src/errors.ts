// Blockchain-specific error types for the @veritas/blockchain package

import { AppError, type AppErrorOptions } from "@veritas/core";

export class BlockchainError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
    this.name = "BlockchainError";
  }
}

export class ContractCallError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
    this.name = "ContractCallError";
  }
}

export class InvalidAddressError extends AppError {
  constructor(address: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Invalid EVM address: ${address}`, options);
    this.name = "InvalidAddressError";
  }
}

export class TransactionNotFoundError extends AppError {
  constructor(txHash: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Transaction not found: ${txHash}`, options);
    this.name = "TransactionNotFoundError";
  }
}

export class TransactionRevertedError extends AppError {
  constructor(txHash: string, reason?: string, options?: AppErrorOptions) {
    super(
      "INTERNAL",
      500,
      reason ? `Transaction reverted (${txHash}): ${reason}` : `Transaction reverted: ${txHash}`,
      options
    );
    this.name = "TransactionRevertedError";
  }
}

export class ChainIdMismatchError extends AppError {
  constructor(expected: number, actual: number, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      422,
      `Chain ID mismatch: expected ${expected}, got ${actual}`,
      options
    );
    this.name = "ChainIdMismatchError";
  }
}

export class GasEstimationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Gas estimation failed: ${message}`, options);
    this.name = "GasEstimationError";
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Insufficient funds: ${message}`, options);
    this.name = "InsufficientFundsError";
  }
}
