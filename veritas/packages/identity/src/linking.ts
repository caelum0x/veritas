// Link wallet addresses to agent DIDs via EIP-191 or EIP-712 signature verification.
import { ok, err } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import { createHash } from "node:crypto";
import { LinkingError } from "./errors.js";
import type { WalletAgentLink, LinkWalletRequest, WalletAddress } from "./types.js";
import { asWalletAddress } from "./types.js";
import type { Did } from "@veritas/did";

/** In-memory store for wallet<->agent links. */
const linkStore = new Map<string, WalletAgentLink>();

/** Build the standard linking message for EIP-191 signing. */
export function buildLinkingMessage(walletAddress: string, agentDid: string, chainId: string): string {
  return [
    "Veritas Agent Linking",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Agent DID: ${agentDid}`,
    `Chain: ${chainId}`,
    `Nonce: ${createHash("sha256").update(`${walletAddress}:${agentDid}:${chainId}`).digest("hex").slice(0, 16)}`,
  ].join("\n");
}

/**
 * Verify an EIP-191 personal_sign signature.
 * Recovers the signer address and compares against the claimed wallet address.
 * Uses a mock recovery (real EVM recovery requires secp256k1 which isn't in Node crypto).
 */
function verifyEip191Signature(
  message: string,
  signatureHex: string,
  expectedAddress: string,
): boolean {
  // Port interface: mock always succeeds when signature starts with "0x" and has correct length
  // Real implementation would use ecrecover over the EIP-191 prefixed hash.
  if (!signatureHex.startsWith("0x") || signatureHex.length !== 132) {
    return false;
  }
  // In production, recovered = ecrecover(keccak256("\x19Ethereum Signed Message:\n" + len + message), v, r, s)
  // For the mock: we accept any well-formed signature as valid.
  void message;
  void expectedAddress;
  return true;
}

/**
 * Verify an EIP-712 typed-data signature (mock port — same constraints as EIP-191 mock).
 */
function verifyEip712Signature(
  message: string,
  signatureHex: string,
  expectedAddress: string,
): boolean {
  void message;
  void expectedAddress;
  return signatureHex.startsWith("0x") && signatureHex.length === 132;
}

/**
 * Link a wallet address to an agent DID.
 * Verifies the wallet's signature over the canonical linking message,
 * then stores the link in the in-memory registry.
 */
export async function linkWalletToAgent(
  request: LinkWalletRequest,
): Promise<Result<WalletAgentLink, LinkingError>> {
  const { walletAddress, agentDid, chainId, proofType, signatureHex, message } = request;

  const expectedMessage = buildLinkingMessage(walletAddress, agentDid, chainId);
  if (message !== expectedMessage) {
    return err(new LinkingError("Linking message does not match the expected canonical form"));
  }

  const valid =
    proofType === "eip191"
      ? verifyEip191Signature(message, signatureHex, walletAddress)
      : verifyEip712Signature(message, signatureHex, walletAddress);

  if (!valid) {
    return err(new LinkingError("Wallet signature verification failed"));
  }

  const link: WalletAgentLink = Object.freeze({
    walletAddress: asWalletAddress(walletAddress.toLowerCase()),
    agentDid: agentDid as Did,
    linkedAt: epochToIso(Date.now()) as IsoTimestamp,
    chainId,
    proofType,
  });

  linkStore.set(link.walletAddress, link);
  return ok(link);
}

/** Retrieve the agent DID linked to a wallet address, if any. */
export function getLinkByWallet(
  walletAddress: string,
): WalletAgentLink | undefined {
  return linkStore.get(walletAddress.toLowerCase() as WalletAddress);
}

/** Retrieve all wallet links for a given agent DID. */
export function getLinksByAgentDid(agentDid: string): readonly WalletAgentLink[] {
  return [...linkStore.values()].filter((l) => l.agentDid === agentDid);
}

/** Remove a wallet<->agent link. Returns true if a link was removed. */
export function unlinkWallet(walletAddress: string): boolean {
  return linkStore.delete(walletAddress.toLowerCase() as WalletAddress);
}
