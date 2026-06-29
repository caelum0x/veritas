// Referrals feature service: delegates to @veritas/referrals ReferralService via container deps.
import { isOk, isErr, type Result } from "@veritas/core";
import type { Referral, ReferralProgram, Reward } from "@veritas/referrals";
import type { Deps } from "../../container.js";
import type {
  CreateProgramBody,
  RegisterClickBody,
  AttributeSignupBody,
} from "./referrals.schema.js";

export interface IssueRewardsInput {
  readonly referralId: string;
}

export interface ReferralsServiceResult<T> {
  readonly data?: T;
  readonly error?: { readonly kind: string; readonly message: string };
}

export class ReferralsService {
  constructor(private readonly deps: Deps) {}

  async createProgram(body: CreateProgramBody): Promise<Result<ReferralProgram>> {
    return this.deps.referralService.createProgram(body);
  }

  async getProgram(programId: string): Promise<Result<ReferralProgram>> {
    return this.deps.referralService.getProgram(programId);
  }

  async listPrograms(): Promise<Result<readonly ReferralProgram[]>> {
    return this.deps.referralService.listPrograms();
  }

  async registerClick(body: RegisterClickBody): Promise<Result<Referral>> {
    return this.deps.referralService.registerClick(body.programId, body.referrerId, {
      code: body.code,
      ip: body.ip,
      userAgent: body.userAgent,
      metadata: body.metadata,
    });
  }

  async attributeSignup(body: AttributeSignupBody): Promise<Result<Referral>> {
    return this.deps.referralService.attributeSignup({
      referralId: body.referralId,
      request: body.request,
      fraudSignals: body.fraudSignals,
    });
  }

  async issueRewards(input: IssueRewardsInput): Promise<Result<readonly Reward[]>> {
    return this.deps.referralService.issueRewards({ referralId: input.referralId });
  }

  async listByReferrer(
    referrerId: string,
    programId?: string,
  ): Promise<Result<readonly Referral[]>> {
    return this.deps.referralService.getReferralsByReferrer(referrerId, programId);
  }

  generateCodeForUser(userId: string): string {
    return this.deps.referralService.generateCodeForUser(userId);
  }
}
