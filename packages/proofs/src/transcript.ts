// Proof transcript: ordered sequence of labelled data-hash messages with a rolling root.
import { sha256Hex } from "@veritas/crypto";
import { canonicalize, newId, epochToIso, type IsoTimestamp } from "@veritas/core";
import type { ProofTranscript, TranscriptMessage } from "./types.js";
import { TranscriptError } from "./errors.js";

/** Internal mutable builder — never exposed outside this module. */
interface TranscriptBuilder {
  readonly id: string;
  readonly createdAt: IsoTimestamp;
  messages: TranscriptMessage[];
  rollingHash: string;
  finalized: boolean;
}

const builders = new Map<string, TranscriptBuilder>();

/** Create a new, empty transcript and return its id. */
export function createTranscript(): string {
  const id = newId("txcript");
  const createdAt = epochToIso(Date.now());
  builders.set(id, {
    id,
    createdAt,
    messages: [],
    rollingHash: sha256Hex("genesis"),
    finalized: false,
  });
  return id;
}

/**
 * Append a labelled data hash to the transcript.
 * Throws TranscriptError if the transcript is already finalized or unknown.
 */
export function appendToTranscript(id: string, label: string, dataHash: string): TranscriptMessage {
  const builder = builders.get(id);
  if (!builder) throw new TranscriptError(`Unknown transcript: ${id}`);
  if (builder.finalized) throw new TranscriptError(`Transcript ${id} is already finalized`);

  const sequenceNumber = builder.messages.length;
  const msg: TranscriptMessage = { label, dataHash, sequenceNumber };

  // rolling hash = SHA-256(prev || label || dataHash || seqNo)
  const next = sha256Hex(
    canonicalize({ prev: builder.rollingHash, label, dataHash, sequenceNumber })
  );
  builder.messages = [...builder.messages, msg];
  builder.rollingHash = next;
  return msg;
}

/**
 * Finalize a transcript; returns an immutable ProofTranscript snapshot.
 * Throws TranscriptError if already finalized or not found.
 */
export function finalizeTranscript(id: string): ProofTranscript {
  const builder = builders.get(id);
  if (!builder) throw new TranscriptError(`Unknown transcript: ${id}`);
  if (builder.finalized) throw new TranscriptError(`Transcript ${id} already finalized`);

  builder.finalized = true;
  const finalizedAt = epochToIso(Date.now());

  const transcript: ProofTranscript = {
    id: builder.id,
    messages: builder.messages,
    rootHash: builder.rollingHash,
    createdAt: builder.createdAt,
    finalizedAt,
  };

  builders.delete(id);
  return transcript;
}

/**
 * Replay a finalized ProofTranscript to verify its rootHash is consistent.
 * Returns true if the transcript is internally consistent.
 */
export function verifyTranscript(transcript: ProofTranscript): boolean {
  try {
    let rolling = sha256Hex("genesis");
    for (const msg of transcript.messages) {
      rolling = sha256Hex(
        canonicalize({
          prev: rolling,
          label: msg.label,
          dataHash: msg.dataHash,
          sequenceNumber: msg.sequenceNumber,
        })
      );
    }
    return rolling === transcript.rootHash;
  } catch {
    return false;
  }
}
