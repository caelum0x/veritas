// Manages sandbox API credentials: issuance, rotation, and revocation
import { Result, ok, err, newId } from "@veritas/core";
import {
  SandboxCredential,
  SandboxCredentialKind,
  SandboxCredentialSchema,
} from "./types.js";
import {
  SandboxCredentialNotFoundError,
  SandboxCredentialRevokedError,
  SandboxNotFoundError,
} from "./errors.js";

const credentialStore = new Map<string, SandboxCredential>();
const sandboxCredentials = new Map<string, Set<string>>();

function generateSecret(kind: SandboxCredentialKind): { key: string; secret?: string } {
  const prefix = kind === "api_key" ? "sk_sandbox_" : kind === "webhook_secret" ? "whsec_" : "jwt_";
  const key = `${prefix}${newId("cred")}`;
  if (kind === "oauth_client") {
    return { key, secret: `cs_${newId("cred")}` };
  }
  return { key };
}

export function issueCredential(
  sandboxId: string,
  kind: SandboxCredentialKind,
  expiresAt?: string
): Result<SandboxCredential, SandboxNotFoundError> {
  const id = newId("cred");
  const now = new Date().toISOString();
  const { key, secret } = generateSecret(kind);

  const credential: SandboxCredential = SandboxCredentialSchema.parse({
    id,
    sandboxId,
    kind,
    key,
    ...(secret !== undefined ? { secret } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    createdAt: now,
  });

  credentialStore.set(id, credential);

  const existing = sandboxCredentials.get(sandboxId) ?? new Set<string>();
  sandboxCredentials.set(sandboxId, new Set([...existing, id]));

  return ok(credential);
}

export function getCredential(
  credentialId: string
): Result<SandboxCredential, SandboxCredentialNotFoundError | SandboxCredentialRevokedError> {
  const credential = credentialStore.get(credentialId);
  if (credential === undefined) {
    return err(new SandboxCredentialNotFoundError(credentialId));
  }
  if (credential.revokedAt !== undefined) {
    return err(new SandboxCredentialRevokedError(credentialId));
  }
  return ok(credential);
}

export function revokeCredential(
  credentialId: string
): Result<SandboxCredential, SandboxCredentialNotFoundError> {
  const credential = credentialStore.get(credentialId);
  if (credential === undefined) {
    return err(new SandboxCredentialNotFoundError(credentialId));
  }
  const revoked: SandboxCredential = { ...credential, revokedAt: new Date().toISOString() };
  credentialStore.set(credentialId, revoked);
  return ok(revoked);
}

export function listCredentials(sandboxId: string): readonly SandboxCredential[] {
  const ids = sandboxCredentials.get(sandboxId);
  if (ids === undefined) return [];
  return [...ids]
    .map((id) => credentialStore.get(id))
    .filter((c): c is SandboxCredential => c !== undefined);
}

export function revokeAllCredentials(sandboxId: string): void {
  const ids = sandboxCredentials.get(sandboxId);
  if (ids === undefined) return;
  const now = new Date().toISOString();
  for (const id of ids) {
    const credential = credentialStore.get(id);
    if (credential !== undefined && credential.revokedAt === undefined) {
      credentialStore.set(id, { ...credential, revokedAt: now });
    }
  }
}

export function rotateCredential(
  credentialId: string
): Result<SandboxCredential, SandboxCredentialNotFoundError | SandboxCredentialRevokedError> {
  const existing = getCredential(credentialId);
  if (existing.ok === false) return existing;

  revokeCredential(credentialId);
  return issueCredential(existing.value.sandboxId, existing.value.kind, existing.value.expiresAt);
}
