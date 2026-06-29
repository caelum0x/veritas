// Attest a VerificationReport on-chain: hash → encode → submit → record.

import { ok, err, type Result, contentHash, canonicalize } from "@veritas/core";
import type { ContentHash } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import { deriveUid, ZERO_UID, type AttestationUid } from "./uid.js";
import { buildAttestationPayload, serializePayload } from "./encoder.js";
import { deriveSchemaUid, VERITAS_REPORT_SCHEMA } from "./schema.js";
import type { OnchainPort } from "./onchain-port.js";
import type { AttestationRecordStore } from "./record-store.js";
import type { Attestation, AttestationData } from "./attestation.js";
import { AttestationPublishError } from "./errors.js";
import type { ReportAttestOptions, ReportAttestResult } from "./types.js";
import type { HexString } from "@veritas/blockchain";

const SCHEMA_UID = deriveSchemaUid(VERITAS_REPORT_SCHEMA) as HexString;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/** Derives a ContentHash from a VerificationReport by hashing its canonical JSON. */
export function hashReport(report: VerificationReport): ContentHash {
  return contentHash(canonicalize(report as Record<string, unknown>));
}

/** Maps a VerificationReport's verdict to the AttestationData verdict field. */
function deriveVerdict(
  report: VerificationReport,
): AttestationData["verdict"] {
  const counts = report.counts;
  if (counts.supported > 0 && counts.refuted === 0 && counts.unverifiable === 0) {
    return "supported";
  }
  if (counts.refuted > 0 && counts.supported === 0 && counts.unverifiable === 0) {
    return "refuted";
  }
  if (counts.supported === 0 && counts.refuted === 0) {
    return "unverifiable";
  }
  return "mixed";
}

/** Builds an Attestation record from a report, UID, and receipt details. */
function buildAttestationRecord(opts: {
  readonly uid: AttestationUid;
  readonly reportHash: ContentHash;
  readonly reportId: string;
  readonly verificationId: string;
  readonly report: VerificationReport;
  readonly attester: string;
  readonly recipient: string;
  readonly chainId: number;
  readonly txHash: string;
  readonly blockNumber: bigint;
  readonly issuedAt: number;
  readonly revocable: boolean;
}): Attestation {
  const data: AttestationData = {
    reportId: opts.reportId,
    reportHash: opts.reportHash,
    verificationId: opts.verificationId,
    trustScore: opts.report.trustScore / 100,
    verdict: deriveVerdict(opts.report),
    claimCount: opts.report.claims.length,
    issuedAt: opts.issuedAt,
  };

  return {
    uid: opts.uid,
    schemaUid: SCHEMA_UID,
    attester: opts.attester,
    recipient: opts.recipient,
    data,
    revocable: opts.revocable,
    status: "active",
    txHash: opts.txHash,
    blockNumber: opts.blockNumber,
    chainId: opts.chainId,
    createdAt: opts.issuedAt,
  };
}

/** Orchestrates hashing, encoding, on-chain submission, and record storage for a report. */
export class ReportAttester {
  constructor(
    private readonly chain: OnchainPort,
    private readonly store: AttestationRecordStore,
  ) {}

  async attest(
    report: VerificationReport,
    reportId: string,
    verificationId: string,
    options: ReportAttestOptions,
  ): Promise<Result<ReportAttestResult>> {
    const reportHash = hashReport(report);
    const revocable = options.revocable ?? true;
    const recipient = options.recipient ?? ZERO_ADDR;
    const expirationTime = options.expirationTime ?? 0n;
    const issuedAt = Math.floor(Date.now() / 1000);

    const attester = await this.chain.signerAddress();

    const uid = deriveUid({
      schemaId: SCHEMA_UID,
      attester,
      recipient,
      reportHash,
      refUid: ZERO_UID,
      time: issuedAt,
      expirationTime: Number(expirationTime),
      revocable,
      salt: reportId,
    });

    const payload = buildAttestationPayload({
      schemaUid: SCHEMA_UID,
      recipient,
      contentHash: reportHash,
      revocable,
      expirationTime,
    });

    const calldata = serializePayload(payload);

    const txResult = await this.chain.sendTransaction({
      to: attester,
      data: calldata,
      value: 0n,
    });

    if (!txResult.ok) {
      return err(
        new AttestationPublishError(
          txResult.error instanceof Error ? txResult.error.message : String(txResult.error),
        ),
      );
    }

    const receipt = txResult.value;

    if (receipt.status === "reverted") {
      return err(new AttestationPublishError(`Transaction reverted: ${receipt.txHash}`));
    }

    const record = buildAttestationRecord({
      uid,
      reportHash,
      reportId,
      verificationId,
      report,
      attester,
      recipient,
      chainId: options.chainId,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      issuedAt,
      revocable,
    });

    const saveResult = await this.store.save(record);
    if (!saveResult.ok) {
      return err(
        new AttestationPublishError(
          saveResult.error instanceof Error ? saveResult.error.message : "Store save failed",
        ),
      );
    }

    return ok({
      uid,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      chainId: options.chainId,
      attestedAt: issuedAt,
    });
  }
}
