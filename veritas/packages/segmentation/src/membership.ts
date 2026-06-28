// Membership store — tracks which users belong to which segments.
import { type Result, ok, err } from "@veritas/core";
import { SegmentId, SegmentMembership } from "./types.js";
import { MembershipNotFoundError } from "./errors.js";

export interface MembershipStore {
  add(segmentId: SegmentId, userId: string, addedAt: string): void;
  remove(segmentId: SegmentId, userId: string): Result<void, MembershipNotFoundError>;
  has(segmentId: SegmentId, userId: string): boolean;
  getMembershipsForUser(userId: string): ReadonlyArray<SegmentMembership>;
  getMembershipsForSegment(segmentId: SegmentId): ReadonlyArray<SegmentMembership>;
  countForSegment(segmentId: SegmentId): number;
  removeSegment(segmentId: SegmentId): void;
}

/** In-memory membership store backed by nested immutable maps. */
export function createMembershipStore(): MembershipStore {
  // segmentId -> userId -> SegmentMembership
  let bySegment = new Map<string, Map<string, SegmentMembership>>();

  function add(segmentId: SegmentId, userId: string, addedAt: string): void {
    const entry: SegmentMembership = { segmentId, userId, addedAt };
    const existing = bySegment.get(segmentId) ?? new Map<string, SegmentMembership>();
    const updated = new Map(existing);
    updated.set(userId, entry);
    bySegment = new Map(bySegment);
    bySegment.set(segmentId, updated);
  }

  function remove(segmentId: SegmentId, userId: string): Result<void, MembershipNotFoundError> {
    const members = bySegment.get(segmentId);
    if (members === undefined || !members.has(userId)) {
      return err(new MembershipNotFoundError(userId, segmentId));
    }
    const updated = new Map(members);
    updated.delete(userId);
    bySegment = new Map(bySegment);
    bySegment.set(segmentId, updated);
    return ok(undefined);
  }

  function has(segmentId: SegmentId, userId: string): boolean {
    return bySegment.get(segmentId)?.has(userId) ?? false;
  }

  function getMembershipsForUser(userId: string): ReadonlyArray<SegmentMembership> {
    const results: SegmentMembership[] = [];
    for (const members of bySegment.values()) {
      const entry = members.get(userId);
      if (entry !== undefined) results.push(entry);
    }
    return results;
  }

  function getMembershipsForSegment(segmentId: SegmentId): ReadonlyArray<SegmentMembership> {
    const members = bySegment.get(segmentId);
    return members !== undefined ? Array.from(members.values()) : [];
  }

  function countForSegment(segmentId: SegmentId): number {
    return bySegment.get(segmentId)?.size ?? 0;
  }

  function removeSegment(segmentId: SegmentId): void {
    bySegment = new Map(bySegment);
    bySegment.delete(segmentId);
  }

  return { add, remove, has, getMembershipsForUser, getMembershipsForSegment, countForSegment, removeSegment };
}
