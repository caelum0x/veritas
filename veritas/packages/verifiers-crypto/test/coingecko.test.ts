// Unit tests for the CoinGecko price feed, using an injected fetch (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOk } from "@veritas/core";
import { CoinGeckoPriceFeed } from "../src/sources/coingecko-price-feed.js";

const MARKETS = [
  {
    symbol: "btc",
    current_price: 65000,
    price_change_percentage_24h: 2.5,
    total_volume: 30_000_000_000,
    high_24h: 66000,
    low_24h: 64000,
    market_cap: 1_280_000_000_000,
    last_updated: "2026-06-29T00:00:00.000Z",
  },
];

function stubFetch(payload: unknown, status = 200): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

test("getSpotPrice maps a CoinGecko market row into a PriceRecord", async () => {
  const feed = new CoinGeckoPriceFeed({ fetchImpl: stubFetch(MARKETS) });
  const result = await feed.getSpotPrice("BTC");
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.symbol, "BTC");
  assert.equal(result.value.priceUsd, 65000);
  assert.equal(result.value.priceChange24hPct, 2.5);
  assert.equal(result.value.source, "coingecko");
});

test("search produces a SourceDocument with price metadata", async () => {
  const feed = new CoinGeckoPriceFeed({ fetchImpl: stubFetch(MARKETS) });
  const result = await feed.search({ keywords: ["BTC"], maxResults: 1 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 1);
  assert.equal(result.value[0]!.metadata["priceUsd"], 65000);
  assert.equal(result.value[0]!.metadata["marketCapUsd"], 1_280_000_000_000);
});

test("an HTTP error surfaces as an Err result", async () => {
  const feed = new CoinGeckoPriceFeed({ fetchImpl: stubFetch([], 429) });
  const result = await feed.getSpotPrice("BTC");
  assert.equal(isOk(result), false);
});
