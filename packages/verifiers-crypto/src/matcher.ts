// Crypto claim matcher: detect whether a claim concerns blockchain or cryptocurrency data.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** Keywords strongly indicating a crypto-domain claim. */
const CRYPTO_KEYWORDS: ReadonlyArray<string> = [
  "bitcoin", "ethereum", "btc", "eth", "blockchain", "on-chain", "onchain",
  "transaction", "tx hash", "txhash", "smart contract", "defi", "nft",
  "token", "wallet", "crypto", "cryptocurrency", "stablecoin", "usdc", "usdt",
  "dai", "sol", "solana", "polygon", "matic", "bnb", "binance", "avalanche",
  "avax", "arbitrum", "optimism", "layer 2", "l2", "layer2", "gas fee",
  "gas price", "gwei", "wei", "block", "miner", "validator", "staking",
  "proof of stake", "proof of work", "mining", "hash rate", "mempool",
  "airdrop", "yield farming", "liquidity pool", "amm", "dex", "uniswap",
  "aave", "compound", "curve", "market cap", "all-time high", "ath",
  "hodl", "satoshi", "altcoin", "erc-20", "erc20", "evm", "metamask",
  "ledger", "cold wallet", "hot wallet", "exchange", "coinbase", "binance",
];

/** Domain hint values that map to crypto. */
const CRYPTO_DOMAINS: ReadonlySet<string> = new Set([
  "crypto", "blockchain", "defi", "nft", "web3", "on-chain", "onchain",
  "token", "cryptocurrency",
]);

/** EVM 0x transaction/address hex pattern (40+ hex chars after 0x). */
const EVM_HEX_REGEX = /0x[0-9a-fA-F]{40,}/;

/** Bitcoin transaction ID pattern (64 hex chars without 0x prefix). */
const BTC_TXID_REGEX = /\b[0-9a-fA-F]{64}\b/;

/** Common crypto ticker symbols (not generic financial tickers). */
const CRYPTO_TICKERS_REGEX =
  /\b(BTC|ETH|SOL|BNB|MATIC|AVAX|USDC|USDT|DAI|LINK|UNI|AAVE|CRV|ARB|OP)\b/;

function hasDomainHint(claim: VerifiableClaim): boolean {
  return claim.domain != null && CRYPTO_DOMAINS.has(claim.domain.toLowerCase());
}

function hasCryptoKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some((kw) => lower.includes(kw));
}

function hasEvmOrBtcPattern(text: string): boolean {
  return EVM_HEX_REGEX.test(text) || BTC_TXID_REGEX.test(text);
}

function hasCryptoTicker(text: string): boolean {
  return CRYPTO_TICKERS_REGEX.test(text);
}

/** Extract EVM addresses and tx hashes from claim text. */
export function extractEvmHashes(text: string): ReadonlyArray<string> {
  const matches = text.match(/0x[0-9a-fA-F]{40,}/g) ?? [];
  return [...new Set(matches)];
}

/** Extract bare 64-char hex strings (Bitcoin-style txids). */
export function extractBtcTxIds(text: string): ReadonlyArray<string> {
  const matches = text.match(/\b[0-9a-fA-F]{64}\b/g) ?? [];
  return [...new Set(matches)];
}

/** Extract crypto token symbols mentioned in a claim. */
export function extractCryptoSymbols(text: string): ReadonlyArray<string> {
  const matches = text.match(
    /\b(BTC|ETH|SOL|BNB|MATIC|AVAX|USDC|USDT|DAI|LINK|UNI|AAVE|CRV|ARB|OP)\b/g,
  ) ?? [];
  return [...new Set(matches)];
}

/**
 * Determine if a claim can be handled by the crypto verifier.
 * Uses domain hint, keyword matching, hex patterns, and known ticker symbols.
 */
export function canHandleCryptoClaim(claim: VerifiableClaim): boolean {
  if (hasDomainHint(claim)) return true;
  if (hasCryptoKeywords(claim.text)) return true;
  if (hasEvmOrBtcPattern(claim.text)) return true;
  if (hasCryptoTicker(claim.text)) return true;
  return false;
}

/** Score how strongly a claim appears to be crypto-related [0, 1]. */
export function cryptoRelevanceScore(claim: VerifiableClaim): number {
  const text = claim.text.toLowerCase();
  const matchCount = CRYPTO_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const keywordScore = Math.min(1, matchCount / 4);
  const domainBonus = hasDomainHint(claim) ? 0.3 : 0;
  const hexBonus = hasEvmOrBtcPattern(claim.text) ? 0.25 : 0;
  const tickerBonus = hasCryptoTicker(claim.text) ? 0.2 : 0;
  return Math.min(1, keywordScore + domainBonus + hexBonus + tickerBonus);
}
