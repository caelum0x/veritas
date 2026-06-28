// Public surface re-export for @veritas/request-signing
export type { SignatureAlgorithm, SignatureHeaderFields, SigningKeyEntry, SignRequestParams, VerifyRequestParams, VerificationResult, TimestampWindowOptions } from './types.js';
export { SignatureExpiredError, SignatureMismatchError, InvalidSignatureHeaderError, NoncReusedError, UnknownKeyIdError, UnsupportedSchemeError } from './errors.js';
export type { SchemeImpl } from './scheme.js';
export { getScheme, isSupportedAlgorithm } from './scheme.js';
export { SIGNATURE_HEADER, serializeSignatureHeader, parseSignatureHeader } from './header.js';
export { buildCanonicalRequest, canonicalizeHeaders, canonicalizeQuery } from './canonical.js';
export { generateNonce, InMemoryNonceStore } from './nonce.js';
export { isTimestampValid, currentTimestampSeconds } from './timestamp.js';
export type { KeyStore } from './key-store.js';
export { createKeyStore, makeHmacKeyEntry } from './key-store.js';
export { signRequest } from './signer.js';
export { verifyRequest } from './verifier.js';
