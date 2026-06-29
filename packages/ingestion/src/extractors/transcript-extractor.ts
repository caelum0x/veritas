// Transcript extractor port: extracts text from audio/video via a pluggable ASR backend.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Extractor, ExtractedContent } from "../extractor.js";

const SUPPORTED = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/ogg",
] as const;

/** Port interface for an automatic speech recognition backend. */
export interface AsrEnginePort {
  transcribe(
    buffer: Uint8Array,
    mimeType: string,
  ): Promise<{ transcript: string; durationSeconds: number; language?: string }>;
}

/** In-memory mock ASR engine for dev/test environments. */
export class MockAsrEngine implements AsrEnginePort {
  async transcribe(
    _buffer: Uint8Array,
    mimeType: string,
  ): Promise<{ transcript: string; durationSeconds: number; language?: string }> {
    return {
      transcript: `(mock transcript for ${mimeType})`,
      durationSeconds: 0,
      language: "en",
    };
  }
}

export class TranscriptExtractor implements Extractor {
  readonly supportedMimeTypes: readonly string[] = SUPPORTED;

  constructor(private readonly engine: AsrEnginePort = new MockAsrEngine()) {}

  async extract(input: Uint8Array, mimeType: string): Promise<Result<ExtractedContent>> {
    if (!(SUPPORTED as readonly string[]).includes(mimeType)) {
      return err(new Error(`TranscriptExtractor: unsupported mimeType "${mimeType}"`));
    }
    try {
      const { transcript, durationSeconds, language } = await this.engine.transcribe(
        input,
        mimeType,
      );
      const metadata: Record<string, string> = {
        durationSeconds: String(durationSeconds),
      };
      if (language !== undefined) metadata["language"] = language;
      return ok({ text: transcript, mimeType, metadata });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
