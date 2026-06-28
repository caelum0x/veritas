// IP reputation service: port interface + in-memory mock for threat intelligence lookups
import { z } from "zod";

export const IpReputationScoreSchema = z.object({
  ip: z.string().min(1),
  score: z.number().min(0).max(100),
  categories: z.array(z.enum(["spam", "botnet", "proxy", "tor", "scanner", "malware", "phishing"])).default([]),
  isThreat: z.boolean(),
  country: z.string().optional(),
  asn: z.string().optional(),
  lastSeen: z.string().optional(),
  provider: z.string(),
});
export type IpReputationScore = z.infer<typeof IpReputationScoreSchema>;

export type IpReputationCategory = IpReputationScore["categories"][number];

export interface IpReputationProvider {
  lookup(ip: string): Promise<IpReputationScore>;
  bulkLookup(ips: readonly string[]): Promise<readonly IpReputationScore[]>;
}

const KNOWN_BAD_IPS: ReadonlyMap<string, Partial<IpReputationScore>> = new Map([
  ["192.0.2.1", { score: 95, categories: ["botnet", "scanner"], isThreat: true }],
  ["198.51.100.1", { score: 88, categories: ["spam", "proxy"], isThreat: true }],
  ["203.0.113.1", { score: 75, categories: ["tor"], isThreat: true }],
  ["10.0.0.1", { score: 10, categories: [], isThreat: false }],
]);

const TOR_EXIT_NODES: ReadonlySet<string> = new Set([
  "203.0.113.1",
  "203.0.113.2",
  "203.0.113.3",
]);

export class MockIpReputationProvider implements IpReputationProvider {
  async lookup(ip: string): Promise<IpReputationScore> {
    const known = KNOWN_BAD_IPS.get(ip);
    if (known) {
      return IpReputationScoreSchema.parse({
        ip,
        score: known.score ?? 50,
        categories: known.categories ?? [],
        isThreat: known.isThreat ?? false,
        provider: "mock",
      });
    }
    const isTor = TOR_EXIT_NODES.has(ip);
    return IpReputationScoreSchema.parse({
      ip,
      score: isTor ? 70 : 0,
      categories: isTor ? (["tor"] as IpReputationCategory[]) : [],
      isThreat: isTor,
      provider: "mock",
    });
  }

  async bulkLookup(ips: readonly string[]): Promise<readonly IpReputationScore[]> {
    return Promise.all(ips.map((ip) => this.lookup(ip)));
  }
}

export class CachingIpReputationProvider implements IpReputationProvider {
  private readonly cache = new Map<string, { score: IpReputationScore; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(
    private readonly delegate: IpReputationProvider,
    ttlMs = 300_000,
  ) {
    this.ttlMs = ttlMs;
  }

  async lookup(ip: string): Promise<IpReputationScore> {
    const cached = this.cache.get(ip);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.score;
    }
    const score = await this.delegate.lookup(ip);
    this.cache.set(ip, { score, expiresAt: Date.now() + this.ttlMs });
    return score;
  }

  async bulkLookup(ips: readonly string[]): Promise<readonly IpReputationScore[]> {
    return Promise.all(ips.map((ip) => this.lookup(ip)));
  }

  invalidate(ip: string): void {
    this.cache.delete(ip);
  }

  clear(): void {
    this.cache.clear();
  }
}

export function isThreatIp(score: IpReputationScore, threshold = 60): boolean {
  return score.isThreat || score.score >= threshold;
}

export function createIpReputationProvider(options?: { ttlMs?: number }): IpReputationProvider {
  const base = new MockIpReputationProvider();
  return new CachingIpReputationProvider(base, options?.ttlMs);
}
