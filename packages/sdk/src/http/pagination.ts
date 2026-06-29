// Auto-paginating async iterator for cursor-based API list endpoints.
import type { Transport, RequestOptions } from "./transport.js";
import { parsePageResponse } from "./response.js";
import { SdkHttpError } from "./errors.js";

export interface PageFetchOptions {
  /** Base request options (path, query, method must be GET) */
  base: Omit<RequestOptions, "method">;
  /** Initial cursor (undefined = first page) */
  initialCursor?: string;
  /** Max items to return in total (undefined = all) */
  limit?: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | undefined;
  total: number;
}

/** Fetch a single page; returns items + pagination state. */
export async function fetchPage<T>(
  transport: Transport,
  options: Omit<RequestOptions, "method">,
  cursor?: string,
): Promise<PageResult<T>> {
  const query: Record<string, string | number | boolean | undefined> = {
    ...(options.query ?? {}),
  };
  if (cursor) {
    query["cursor"] = cursor;
  }

  const result = await transport.request({
    ...options,
    method: "GET",
    query,
  });

  if (result.ok === false) {
    throw result.error;
  }

  const parsed = parsePageResponse<T>(result.value);
  if (parsed.ok === false) {
    throw parsed.error;
  }

  return {
    items: parsed.value.data,
    nextCursor: parsed.value.meta.nextCursor,
    total: parsed.value.meta.total,
  };
}

/** Returns an async generator that yields items page by page until exhausted. */
export async function* paginate<T>(
  transport: Transport,
  opts: PageFetchOptions,
): AsyncGenerator<T, void, undefined> {
  let cursor: string | undefined = opts.initialCursor;
  let emitted = 0;
  const cap = opts.limit ?? Infinity;

  do {
    const page = await fetchPage<T>(transport, opts.base, cursor);

    for (const item of page.items) {
      if (emitted >= cap) return;
      yield item;
      emitted++;
    }

    cursor = page.nextCursor;
  } while (cursor !== undefined && emitted < cap);
}

/** Collect all pages into a single array (up to optional limit). */
export async function collectAll<T>(
  transport: Transport,
  opts: PageFetchOptions,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of paginate<T>(transport, opts)) {
    items.push(item);
  }
  return items;
}

/** Thin class wrapper around paginate() for resource clients. */
export class PaginatedIterator<T> implements AsyncIterable<T> {
  private readonly transport: Transport;
  private readonly opts: PageFetchOptions;

  constructor(transport: Transport, opts: PageFetchOptions) {
    this.transport = transport;
    this.opts = opts;
  }

  [Symbol.asyncIterator](): AsyncGenerator<T, void, undefined> {
    return paginate<T>(this.transport, this.opts);
  }

  async toArray(): Promise<T[]> {
    return collectAll<T>(this.transport, this.opts);
  }
}

export { SdkHttpError };
