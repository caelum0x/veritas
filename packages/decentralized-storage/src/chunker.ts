// Content chunker: splits large byte arrays into fixed-size chunks for block-level storage.

/** Default chunk size: 256 KiB — matches common IPFS UnixFS default. */
export const DEFAULT_CHUNK_SIZE = 256 * 1024;

/** A single content chunk with its index and byte range metadata. */
export interface Chunk {
  readonly index: number;
  readonly data: Uint8Array;
  readonly offset: number;
  readonly length: number;
}

/** Options for the chunker. */
export interface ChunkerOptions {
  /** Maximum byte length per chunk. Defaults to DEFAULT_CHUNK_SIZE. */
  readonly chunkSize?: number;
}

/**
 * Split content into fixed-size chunks.
 * Returns an empty array for empty content.
 */
export function chunk(content: Uint8Array, options: ChunkerOptions = {}): ReadonlyArray<Chunk> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  if (chunkSize < 1) throw new RangeError("chunkSize must be >= 1");
  if (content.length === 0) return [];

  const chunks: Chunk[] = [];
  let offset = 0;
  let index = 0;

  while (offset < content.length) {
    const end = Math.min(offset + chunkSize, content.length);
    const data = content.slice(offset, end);
    chunks.push({ index, data, offset, length: data.length });
    offset = end;
    index += 1;
  }

  return chunks;
}

/**
 * Reassemble an ordered sequence of chunks back into a single Uint8Array.
 * Chunks must be in ascending index order.
 */
export function reassemble(chunks: ReadonlyArray<Chunk>): Uint8Array {
  if (chunks.length === 0) return new Uint8Array(0);

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;

  for (const c of chunks) {
    output.set(c.data, cursor);
    cursor += c.length;
  }

  return output;
}

/** Compute the number of chunks that a byte array would produce. */
export function chunkCount(contentLength: number, chunkSize = DEFAULT_CHUNK_SIZE): number {
  if (contentLength === 0) return 0;
  return Math.ceil(contentLength / chunkSize);
}
