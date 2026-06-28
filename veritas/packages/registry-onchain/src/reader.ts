// Read registry state from the on-chain contract via Provider calls

import { ok, err, type Result, NotFoundError, InternalError, epochToIso } from "@veritas/core";
import { type Provider, type EvmAddress, asEvmAddress } from "@veritas/blockchain";
import { makeRegistryRecord, type RegistryRecord, type RegistryStatus, type RegistryKind } from "./record.js";
import { encodeGetByIdCall, encodeListCall, decodeRegistryEntry } from "./writer.js";

/** Raw decoded tuple from the contract's getEntry(id) return value */
interface RawEntry {
  readonly id: string;
  readonly kind: number;
  readonly owner: string;
  readonly metadataUri: string;
  readonly status: number;
  readonly registeredAt: bigint;
  readonly updatedAt: bigint;
  readonly blockNumber: bigint;
  readonly txHash: string;
}

const KIND_MAP: Record<number, RegistryKind> = { 0: "agent", 1: "service" };
const STATUS_MAP: Record<number, RegistryStatus> = {
  0: "active",
  1: "suspended",
  2: "deregistered",
};

/** Decode a raw on-chain entry tuple into a RegistryRecord */
function decodeEntry(raw: RawEntry): Result<RegistryRecord> {
  const kind = KIND_MAP[raw.kind];
  const status = STATUS_MAP[raw.status];
  if (!kind) return err(new InternalError({ message: `Unknown registry kind: ${raw.kind}` }));
  if (!status) return err(new InternalError({ message: `Unknown registry status: ${raw.status}` }));
  let owner: EvmAddress;
  try {
    owner = asEvmAddress(raw.owner);
  } catch {
    return err(new InternalError({ message: `Invalid owner address: ${raw.owner}` }));
  }
  return ok(
    makeRegistryRecord(
      raw.id,
      kind,
      owner,
      raw.metadataUri,
      status,
      epochToIso(Number(raw.registeredAt) * 1000),
      epochToIso(Number(raw.updatedAt) * 1000),
      raw.blockNumber,
      raw.txHash
    )
  );
}

/** Read a registry entry by id from contract state */
export async function readRegistryById(
  provider: Provider,
  contractAddress: EvmAddress,
  id: string
): Promise<Result<RegistryRecord>> {
  try {
    const data = encodeGetByIdCall(id);
    const hex = await provider.call({ to: contractAddress, data });
    const raw = decodeRegistryEntry(hex) as RawEntry;
    if (!raw.id || raw.id === "") {
      return err(new NotFoundError({ message: `Registry entry not found: ${id}` }));
    }
    return decodeEntry(raw);
  } catch (e) {
    return err(new InternalError({ message: "readRegistryById failed", cause: e }));
  }
}

/** Read all registry entries (agent or service kind) from contract state */
export async function readRegistryList(
  provider: Provider,
  contractAddress: EvmAddress,
  kind: RegistryKind
): Promise<Result<readonly RegistryRecord[]>> {
  try {
    const data = encodeListCall(kind);
    const hex = await provider.call({ to: contractAddress, data });
    const raws = decodeRegistryEntry(hex) as RawEntry[];
    if (!Array.isArray(raws)) {
      return ok([]);
    }
    const records: RegistryRecord[] = [];
    for (const raw of raws) {
      const result = decodeEntry(raw);
      if (!result.ok) return result;
      records.push(result.value);
    }
    return ok(records);
  } catch (e) {
    return err(new InternalError({ message: "readRegistryList failed", cause: e }));
  }
}
