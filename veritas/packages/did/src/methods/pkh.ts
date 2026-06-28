// did:pkh method resolver — EVM address-based DIDs per CAIP-10/did:pkh spec
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { isEvmAddress, asEvmAddress } from "@veritas/blockchain";
import type { DidDocument } from "../document.js";
import type { Did } from "../did.js";
import type { VerificationMethod } from "../verification-method.js";
import { DidResolutionError } from "../errors.js";

/** Supported CAIP-2 chain namespaces for did:pkh */
const SUPPORTED_CHAINS = new Set(["eip155"]);

export interface PkhComponents {
  readonly namespace: string;
  readonly chainId: string;
  readonly address: string;
}

/** A verification method that includes a CAIP-10 blockchainAccountId field. */
export interface BlockchainVerificationMethod extends VerificationMethod {
  readonly blockchainAccountId: string;
}

/** Parse did:pkh:<namespace>:<chainId>:<address> into components */
export function parsePkh(did: string): Result<PkhComponents, DidResolutionError> {
  const parts = did.split(":");
  if (parts.length < 5 || parts[0] !== "did" || parts[1] !== "pkh") {
    return err(new DidResolutionError(did, `Invalid did:pkh format: ${did}`));
  }
  const [, , namespace, chainId, address] = parts;
  if (!namespace || !chainId || !address) {
    return err(new DidResolutionError(did, `Missing components in did:pkh: ${did}`));
  }
  if (!SUPPORTED_CHAINS.has(namespace)) {
    return err(new DidResolutionError(did, `Unsupported chain namespace: ${namespace}`));
  }
  if (namespace === "eip155" && !isEvmAddress(address)) {
    return err(new DidResolutionError(did, `Invalid EVM address in did:pkh: ${address}`));
  }
  return ok({ namespace, chainId, address });
}

/** Resolve a did:pkh DID to its DID Document */
export function resolvePkh(did: string): Result<DidDocument, DidResolutionError> {
  const componentsResult = parsePkh(did);
  if (!componentsResult.ok) return err(componentsResult.error as DidResolutionError);
  const { namespace, chainId, address } = componentsResult.value;

  const vmId = `${did}#blockchainAccountId`;
  const caip10 = `${namespace}:${chainId}:${address}`;

  const vm: BlockchainVerificationMethod = Object.freeze({
    id: vmId,
    type: "EcdsaSecp256k1RecoveryMethod2020",
    controller: did as Did,
    blockchainAccountId: caip10,
  });

  const doc: DidDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/secp256k1-2019/v1",
    ],
    id: did as Did,
    verificationMethod: [vm],
    authentication: [vmId],
    assertionMethod: [vmId],
    service: [],
  };

  return ok(doc);
}

/** Check whether a string is a valid did:pkh identifier */
export function isPkhDid(did: string): boolean {
  return did.startsWith("did:pkh:") && parsePkh(did).ok;
}

/** Build a did:pkh DID from an EVM address on a given chain */
export function buildPkhDid(chainId: string, address: string): Result<Did, DidResolutionError> {
  const fakeDid = `did:pkh:eip155:${chainId}:${address}`;
  if (!isEvmAddress(address)) {
    return err(new DidResolutionError(fakeDid, `Invalid EVM address: ${address}`));
  }
  const evmAddr = asEvmAddress(address);
  return ok(`did:pkh:eip155:${chainId}:${evmAddr}` as Did);
}
