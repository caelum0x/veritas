// Consent store: in-memory repository for consent records and withdrawals.
import { Result, ok, err, IsoTimestamp } from "@veritas/core";
import { type Consent } from "./consent.js";
import { type Withdrawal } from "./withdrawal.js";
import { type ConsentProof } from "./proof.js";
import { ConsentNotFoundError, ConsentAlreadyWithdrawnError } from "./errors.js";

export interface ConsentFilter {
  userId?: string;
  purposeId?: string;
  status?: Consent["status"];
}

export interface ConsentStore {
  saveConsent(consent: Consent): Consent;
  getConsent(id: string): Result<Consent, ConsentNotFoundError>;
  listConsents(filter?: ConsentFilter): ReadonlyArray<Consent>;
  updateConsent(consent: Consent): Result<Consent, ConsentNotFoundError>;
  saveWithdrawal(withdrawal: Withdrawal): Withdrawal;
  getWithdrawalsForConsent(consentId: string): ReadonlyArray<Withdrawal>;
  saveProof(proof: ConsentProof): ConsentProof;
  getProofsForConsent(consentId: string): ReadonlyArray<ConsentProof>;
}

export function createInMemoryConsentStore(): ConsentStore {
  const consents = new Map<string, Consent>();
  const withdrawals = new Map<string, Withdrawal[]>();
  const proofs = new Map<string, ConsentProof[]>();

  return {
    saveConsent(consent: Consent): Consent {
      consents.set(consent.id, consent);
      return consent;
    },

    getConsent(id: string): Result<Consent, ConsentNotFoundError> {
      const consent = consents.get(id);
      if (consent === undefined) {
        return err(new ConsentNotFoundError(id));
      }
      return ok(consent);
    },

    listConsents(filter?: ConsentFilter): ReadonlyArray<Consent> {
      const all = Array.from(consents.values());
      if (filter === undefined) return all;
      return all.filter((c) => {
        if (filter.userId !== undefined && c.userId !== filter.userId) return false;
        if (filter.purposeId !== undefined && c.purposeId !== filter.purposeId) return false;
        if (filter.status !== undefined && c.status !== filter.status) return false;
        return true;
      });
    },

    updateConsent(consent: Consent): Result<Consent, ConsentNotFoundError> {
      if (!consents.has(consent.id)) {
        return err(new ConsentNotFoundError(consent.id));
      }
      consents.set(consent.id, consent);
      return ok(consent);
    },

    saveWithdrawal(withdrawal: Withdrawal): Withdrawal {
      const existing = withdrawals.get(withdrawal.consentId) ?? [];
      withdrawals.set(withdrawal.consentId, [...existing, withdrawal]);
      return withdrawal;
    },

    getWithdrawalsForConsent(consentId: string): ReadonlyArray<Withdrawal> {
      return withdrawals.get(consentId) ?? [];
    },

    saveProof(proof: ConsentProof): ConsentProof {
      const existing = proofs.get(proof.consentId) ?? [];
      proofs.set(proof.consentId, [...existing, proof]);
      return proof;
    },

    getProofsForConsent(consentId: string): ReadonlyArray<ConsentProof> {
      return proofs.get(consentId) ?? [];
    },
  };
}
