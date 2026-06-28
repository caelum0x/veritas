// IP allow/deny list checks supporting CIDR ranges and exact addresses

import { Result, ok, err } from "@veritas/core";

export interface IpAllowlist {
  readonly allowedCidrs: readonly string[];
  readonly deniedCidrs: readonly string[];
}

interface ParsedCidr {
  readonly networkInt: number;
  readonly mask: number;
  readonly prefixLength: number;
}

function parseIpv4(ip: string): Result<number, string> {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return err(`Invalid IPv4 address: ${ip}`);
  }
  let value = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255 || String(octet) !== part) {
      return err(`Invalid IPv4 octet "${part}" in address: ${ip}`);
    }
    value = (value << 8) | octet;
  }
  return ok(value >>> 0);
}

function parseCidr(cidr: string): Result<ParsedCidr, string> {
  const slashIdx = cidr.indexOf("/");
  const ipPart = slashIdx === -1 ? cidr : cidr.slice(0, slashIdx);
  const prefixLength = slashIdx === -1 ? 32 : parseInt(cidr.slice(slashIdx + 1), 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return err(`Invalid CIDR prefix length in: ${cidr}`);
  }

  const ipResult = parseIpv4(ipPart);
  if (!ipResult.ok) {
    return err(ipResult.error);
  }

  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  const networkInt = (ipResult.value & mask) >>> 0;

  return ok({ networkInt, mask, prefixLength });
}

function ipMatchesCidr(ipInt: number, cidr: ParsedCidr): boolean {
  return ((ipInt & cidr.mask) >>> 0) === cidr.networkInt;
}

function checkIpAgainstList(ip: string, cidrs: readonly string[]): Result<boolean, string> {
  const ipResult = parseIpv4(ip);
  if (!ipResult.ok) {
    return err(ipResult.error);
  }
  const ipInt = ipResult.value;

  for (const cidr of cidrs) {
    const parsed = parseCidr(cidr);
    if (!parsed.ok) {
      return err(parsed.error);
    }
    if (ipMatchesCidr(ipInt, parsed.value)) {
      return ok(true);
    }
  }
  return ok(false);
}

/**
 * Returns ok(true) if the IP is permitted, ok(false) if denied, err on invalid input.
 * Deny list is checked first; if matched, the IP is rejected even if in allow list.
 * If allow list is empty, any non-denied IP is permitted.
 */
export function isIpAllowed(ip: string, allowlist: IpAllowlist): Result<boolean, string> {
  if (allowlist.deniedCidrs.length > 0) {
    const deniedResult = checkIpAgainstList(ip, allowlist.deniedCidrs);
    if (!deniedResult.ok) return deniedResult;
    if (deniedResult.value) return ok(false);
  }

  if (allowlist.allowedCidrs.length === 0) {
    return ok(true);
  }

  return checkIpAgainstList(ip, allowlist.allowedCidrs);
}

export function createAllowlist(
  allowedCidrs: readonly string[],
  deniedCidrs: readonly string[] = []
): Result<IpAllowlist, string> {
  for (const cidr of [...allowedCidrs, ...deniedCidrs]) {
    const parsed = parseCidr(cidr);
    if (!parsed.ok) {
      return err(`Invalid CIDR "${cidr}": ${parsed.error}`);
    }
  }
  return ok({ allowedCidrs: [...allowedCidrs], deniedCidrs: [...deniedCidrs] });
}

export function openAllowlist(): IpAllowlist {
  return { allowedCidrs: [], deniedCidrs: [] };
}
