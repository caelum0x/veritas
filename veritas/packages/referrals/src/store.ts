// store.ts: in-memory referral store implementing the persistence port for referrals.
import { Result, ok, err } from "@veritas/core";
import { Referral, makeReferral, attributeReferral, markReferralRewarded, markReferralFraud } from "./referral.js";
import { ReferralProgram } from "./program.js";
import { ReferralNotFoundError, ReferralProgramNotFoundError } from "./errors.js";

export interface ReferralStore {
  saveReferral(referral: Referral): Promise<Result<Referral>>;
  getReferral(id: string): Promise<Result<Referral>>;
  findReferralsByReferrer(referrerId: string, programId?: string): Promise<Result<readonly Referral[]>>;
  findReferralsByReferee(refereeId: string): Promise<Result<readonly Referral[]>>;
  findReferralByCode(code: string): Promise<Result<Referral | null>>;
  updateReferral(referral: Referral): Promise<Result<Referral>>;

  saveProgram(program: ReferralProgram): Promise<Result<ReferralProgram>>;
  getProgram(id: string): Promise<Result<ReferralProgram>>;
  getProgramBySlug(slug: string): Promise<Result<ReferralProgram | null>>;
  listPrograms(): Promise<Result<readonly ReferralProgram[]>>;
  updateProgram(program: ReferralProgram): Promise<Result<ReferralProgram>>;
}

export class InMemoryReferralStore implements ReferralStore {
  private readonly referrals = new Map<string, Referral>();
  private readonly programs = new Map<string, ReferralProgram>();

  async saveReferral(referral: Referral): Promise<Result<Referral>> {
    this.referrals.set(referral.id, referral);
    return ok(referral);
  }

  async getReferral(id: string): Promise<Result<Referral>> {
    const referral = this.referrals.get(id);
    if (!referral) return err(new ReferralNotFoundError(id));
    return ok(referral);
  }

  async findReferralsByReferrer(referrerId: string, programId?: string): Promise<Result<readonly Referral[]>> {
    const results = [...this.referrals.values()].filter(
      (r) => r.referrerId === referrerId && (programId === undefined || r.programId === programId),
    );
    return ok(results);
  }

  async findReferralsByReferee(refereeId: string): Promise<Result<readonly Referral[]>> {
    const results = [...this.referrals.values()].filter((r) => r.refereeId === refereeId);
    return ok(results);
  }

  async findReferralByCode(code: string): Promise<Result<Referral | null>> {
    const referral = [...this.referrals.values()].find((r) => r.code === code) ?? null;
    return ok(referral);
  }

  async updateReferral(referral: Referral): Promise<Result<Referral>> {
    if (!this.referrals.has(referral.id)) return err(new ReferralNotFoundError(referral.id));
    this.referrals.set(referral.id, referral);
    return ok(referral);
  }

  async saveProgram(program: ReferralProgram): Promise<Result<ReferralProgram>> {
    this.programs.set(program.id, program);
    return ok(program);
  }

  async getProgram(id: string): Promise<Result<ReferralProgram>> {
    const program = this.programs.get(id);
    if (!program) return err(new ReferralProgramNotFoundError(id));
    return ok(program);
  }

  async getProgramBySlug(slug: string): Promise<Result<ReferralProgram | null>> {
    const program = [...this.programs.values()].find((p) => p.slug === slug) ?? null;
    return ok(program);
  }

  async listPrograms(): Promise<Result<readonly ReferralProgram[]>> {
    return ok([...this.programs.values()]);
  }

  async updateProgram(program: ReferralProgram): Promise<Result<ReferralProgram>> {
    if (!this.programs.has(program.id)) return err(new ReferralProgramNotFoundError(program.id));
    this.programs.set(program.id, program);
    return ok(program);
  }
}
