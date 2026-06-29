// ContractVerify port + mock: verify smart contract source code and metadata for crypto claim verification.

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** Verification status of a smart contract's source code on a block explorer. */
export interface ContractVerifyRecord {
  readonly address: string;
  readonly chainId: number;
  readonly chainName: string;
  readonly isVerified: boolean;
  readonly contractName: string | undefined;
  readonly compilerVersion: string | undefined;
  readonly isProxy: boolean | undefined;
  readonly implementationAddress: string | undefined;
  readonly deployedAt: string | null;
  readonly deployer: string | undefined;
}

/** Port interface for smart contract source verification queries. */
export interface ContractVerifyPort extends DataSourcePort {
  readonly sourceId: "contract-verify";
  /** Look up verification status of a contract by address and chain. */
  verifyContract(address: string, chainId: number): Promise<Result<ContractVerifyRecord, Error>>;
}

function contractToDoc(record: ContractVerifyRecord): SourceDocument {
  return {
    id: `${record.chainId}:${record.address.toLowerCase()}`,
    url: `https://etherscan.io/address/${record.address}`,
    title: `Contract ${record.contractName ?? record.address.slice(0, 10)} on ${record.chainName}`,
    snippet: [
      `Address: ${record.address}`,
      `Verified: ${record.isVerified}`,
      record.contractName ? `Name: ${record.contractName}` : "",
      record.isProxy ? `Proxy → ${record.implementationAddress}` : "",
    ].filter(Boolean).join(" | "),
    publishedAt: record.deployedAt,
    metadata: { ...record },
  };
}

/** Seed entry for MockContractVerify. */
export interface MockContractEntry extends ContractVerifyRecord {
  readonly tags: readonly string[];
}

/** Mock ContractVerifyPort for offline development and testing. */
export class MockContractVerify implements ContractVerifyPort {
  readonly sourceId = "contract-verify" as const;
  readonly displayName = "Mock Smart Contract Verification";

  private readonly store: ReadonlyMap<string, MockContractEntry>;

  constructor(seed: readonly MockContractEntry[] = []) {
    this.store = new Map(seed.map((e) => [`${e.chainId}:${e.address.toLowerCase()}`, e]));
  }

  async verifyContract(address: string, chainId: number): Promise<Result<ContractVerifyRecord, Error>> {
    const key = `${chainId}:${address.toLowerCase()}`;
    const entry = this.store.get(key);
    if (!entry) return err(new Error(`MockContractVerify: contract not found: ${address} on chain ${chainId}`));
    return ok(entry);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const results = [...this.store.values()]
      .filter((e) => lower.some((kw) => e.tags.some((t) => t.toLowerCase().includes(kw)) || e.address.toLowerCase().includes(kw) || (e.contractName ?? "").toLowerCase().includes(kw)))
      .slice(0, query.maxResults)
      .map(contractToDoc);
    return ok(results);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const entry = this.store.get(id.toLowerCase());
    if (!entry) return err(new Error(`MockContractVerify: document not found: ${id}`));
    return ok(contractToDoc(entry));
  }
}

/** Factory producing a MockContractVerify pre-seeded with well-known contract data. */
export function createMockContractVerify(): ContractVerifyPort {
  const seed: MockContractEntry[] = [
    {
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      chainId: 1,
      chainName: "ethereum",
      isVerified: true,
      contractName: "FiatTokenV2_1",
      compilerVersion: "v0.6.12+commit.27d51765",
      isProxy: true,
      implementationAddress: "0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf",
      deployedAt: "2018-10-15T00:00:00.000Z",
      deployer: "0x95ba4cf87d6723ad9c0db21737d862be80e93911",
      tags: ["usdc", "stablecoin", "erc20", "circle", "proxy", "ethereum"],
    },
    {
      address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      chainId: 1,
      chainName: "ethereum",
      isVerified: true,
      contractName: "UniswapV2Router02",
      compilerVersion: "v0.6.6+commit.6c089d02",
      isProxy: false,
      implementationAddress: undefined,
      deployedAt: "2020-05-04T00:00:00.000Z",
      deployer: "0x9c33eacc2f50e39bbace57f3c2c4f9560c40e62e",
      tags: ["uniswap", "dex", "router", "amm", "ethereum", "v2"],
    },
    {
      address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      chainId: 1,
      chainName: "ethereum",
      isVerified: true,
      contractName: "Uni",
      compilerVersion: "v0.7.6+commit.7338295f",
      isProxy: false,
      implementationAddress: undefined,
      deployedAt: "2020-09-16T00:00:00.000Z",
      deployer: "0x1a9c8182c09f50c8318d769245bea52c32be35bc",
      tags: ["uni", "uniswap", "governance", "token", "erc20", "ethereum"],
    },
    {
      address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      chainId: 1,
      chainName: "ethereum",
      isVerified: false,
      contractName: undefined,
      compilerVersion: undefined,
      isProxy: undefined,
      implementationAddress: undefined,
      deployedAt: null,
      deployer: undefined,
      tags: ["unverified", "unknown", "ethereum"],
    },
  ];
  return new MockContractVerify(seed);
}
