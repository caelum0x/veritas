// Stream helpers — convert between Node.js streams and Uint8Array/Buffer.
import { Readable } from "node:stream";

export async function streamToUint8Array(stream: Readable): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export function uint8ArrayToStream(data: Uint8Array): Readable {
  return Readable.from([Buffer.from(data)]);
}

export function stringToStream(data: string, encoding: BufferEncoding = "utf-8"): Readable {
  return Readable.from([Buffer.from(data, encoding)]);
}

export async function streamToString(stream: Readable, encoding: BufferEncoding = "utf-8"): Promise<string> {
  const bytes = await streamToUint8Array(stream);
  return Buffer.from(bytes).toString(encoding);
}

export function bufferToUint8Array(buf: Buffer): Uint8Array {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function normalizeBody(body: Uint8Array | Buffer | string): Uint8Array {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (Buffer.isBuffer(body)) return bufferToUint8Array(body);
  return body;
}
