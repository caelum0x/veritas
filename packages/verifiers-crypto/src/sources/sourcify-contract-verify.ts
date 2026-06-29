// SourcifyContractVerify: a real, keyless ContractVerifyPort backed by the
// Sourcify v2 API (https://sourcify.dev/server/v2/contract/{chain}/{address}).
// Reports on-chain source-verification status plus compiler, proxy and
// deployment metadata. `fetchImpl` is injectable for tests. No API key required.
import { ok, err, type Result } from "@veritas/core";
import type { SourceDocument, SourceQuery } from "@veritas/verifier-kit";
import type { ContractVerifyPort, ContractVerifyRecord } from "./contract-verify.js";

const DEFAULT_BASE_URL = "https://sourcify.dev/server";
const DEFAULT_TIMEOUT_MS = 12_000;
const ENRICH_FIELDS = "compilation,proxyResolution,deployment";
const ADDRESS_RE = /\b0x[0-9a-fA-F]{40}\b/;

const CHAIN_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: "ethereum",
  137: "polygon",
  56: "bnb-chain",
  42161: "arbitrum-one",
  10: "optimism",
  8453: "base",
});

const EXPLORER_ADDR_URLS: Readonly<Record<number, string>> = Object.freeze({
  1: "https://etherscan.io/address/",
  137: "https://polygonscan.com/address/",
  56: "https://bscscan.com/address/",
  42161: "https://arbiscan.io/address/",
  10: "https://optimistic.etherscan.io/address/",
  8453: "https://basescan.org/address/",
});

function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `chain-${chainId}`;
}

function explorerBase(chainId: number): string {
  return EXPLORER_ADDR_URLS[chainId] ?? EXPLORER_ADDR_URLS[1]!;
}

/** Shape of the Sourcify v2 contract response (only the fields we read). */
interface SourcifyV2Response {
  readonly match?: string | null;
  readonly creationMatch?: string | null;
  readonly runtimeMatch?: string | null;
  readonly verifiedAt?: string | null;
  readonly compilation?: {
    readonly name?: string;
    readonly compilerVersion?: string;
  };
  readonly proxyResolution?: {
    readonly isProxy?: boolean;
    readonly implementations?: ReadonlyArray<{ readonly address?: string }>;
  };
  readonly deployment?: {
    readonly deployer?: string;
  };
}

function responseToRecord(address: string, chainId: number, r: SourcifyV2Response): ContractVerifyRecord {
  const isVerified = r.match === "match" || r.runtimeMatch === "match" || r.creationMatch === "match";
  return {
    address,
    chainId,
    chainName: chainName(chainId),
    isVerified,
    contractName: r.compilation?.name,
    compilerVersion: r.compilation?.compilerVersion,
    isProxy: r.proxyResolution?.isProxy,
    implementationAddress: r.proxyResolution?.implementations?.[0]?.address,
    // Sourcify exposes verifiedAt (when the source was verified), not the
    // original deployment timestamp — leave deployedAt null rather than guess.
    deployedAt: null,
    deployer: r.deployment?.deployer,
  };
}

function contractToDoc(record: ContractVerifyRecord): SourceDocument {
  return {
    id: `${record.chainId}:${record.address.toLowerCase()}`,
    url: `${explorerBase(record.chainId)}${record.address}`,
    title: `Contract ${record.contractName ?? record.address.slice(0, 10)} on ${record.chainName}`,
    snippet: [
      `Address: ${record.address}`,
      `Verified: ${record.isVerified}`,
      record.contractName ? `Name: ${record.contractName}` : "",
      record.isProxy ? `Proxy → ${record.implementationAddress ?? "unknown"}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
    publishedAt: record.deployedAt,
    metadata: { ...record },
  };
}

export interface SourcifyContractVerifyOptions {
  /** Fetch implementation; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Sourcify server base URL override. */
  readonly baseUrl?: string;
  /** Default chain id used for keyword-only search. */
  readonly defaultChainId?: number;
}

/** Real ContractVerifyPort backed by the Sourcify v2 API. */
export class SourcifyContractVerify implements ContractVerifyPort {
  readonly sourceId = "contract-verify" as const;
  readonly displayName = "Sourcify Contract Verification";

  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;
  private readonly defaultChainId: number;

  constructor(options: SourcifyContractVerifyOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultChainId = options.defaultChainId ?? 1;
  }

  async verifyContract(address: string, chainId: number): Promise<Result<ContractVerifyRecord, Error>> {
    // The bare endpoint always responds (200 with match=null when the contract
    // is not verified in Sourcify), so it yields a definitive isVerified signal.
    const base = `${this.baseUrl}/v2/contract/${chainId}/${address}`;
    const bareResult = await this.getJson(base);
    if (!bareResult.ok) return err(bareResult.error);
    const bare = bareResult.value as SourcifyV2Response;
    const record = responseToRecord(address, chainId, bare);

    // Only verified contracts have compiler/proxy/deployment data to enrich
    // with; requesting those fields on an unverified address 404s, so skip it.
    if (!record.isVerified) return ok(record);

    const enriched = await this.getJson(`${base}?fields=${ENRICH_FIELDS}`);
    if (!enriched.ok) return ok(record);
    return ok(responseToRecord(address, chainId, enriched.value as SourcifyV2Response));
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const address = query.keywords
      .map((k) => ADDRESS_RE.exec(k)?.[0])
      .find((a): a is string => a !== undefined);
    if (address === undefined) return ok([]);
    const result = await this.verifyContract(address, this.defaultChainId);
    if (!result.ok) return ok([]);
    return ok([contractToDoc(result.value)]);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const [chainPart, addrPart] = id.includes(":") ? id.split(":") : [String(this.defaultChainId), id];
    const chainId = Number.parseInt(chainPart ?? "1", 10);
    const address = addrPart ?? id;
    const result = await this.verifyContract(address, Number.isFinite(chainId) ? chainId : this.defaultChainId);
    if (!result.ok) return err(result.error);
    return ok(contractToDoc(result.value));
  }

  /** Perform a GET with timeout and JSON parsing, normalising failures. */
  private async getJson(url: string): Promise<Result<unknown, Error>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "veritas-verifiers-crypto" },
        signal: controller.signal,
      });
      // Sourcify answers 404 (with a JSON `{match:null}` body) for an address it
      // has no verified contract for — that is a valid "not verified" result,
      // not a transport failure, so parse and return it. Other non-2xx statuses
      // (5xx, rate limits) are genuine errors.
      if (!response.ok && response.status !== 404) {
        return err(new Error(`Sourcify request failed: HTTP ${response.status}`));
      }
      const json: unknown = await response.json();
      return ok(json);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Factory returning the real Sourcify-backed contract verifier. */
export function createSourcifyContractVerify(
  options: SourcifyContractVerifyOptions = {},
): ContractVerifyPort {
  return new SourcifyContractVerify(options);
}
