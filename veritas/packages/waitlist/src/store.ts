// In-memory store for waitlist entries, waitlists, and invites
import type { Waitlist, WaitlistEntry, Invite } from "./types.js";

export interface WaitlistStore {
  // Waitlists
  getWaitlist(id: string): Waitlist | undefined;
  getWaitlistBySlug(slug: string): Waitlist | undefined;
  saveWaitlist(waitlist: Waitlist): void;
  listWaitlists(): readonly Waitlist[];

  // Entries
  getEntry(id: string): WaitlistEntry | undefined;
  getEntryByEmail(waitlistId: string, email: string): WaitlistEntry | undefined;
  getEntryByReferralCode(code: string): WaitlistEntry | undefined;
  saveEntry(entry: WaitlistEntry): void;
  listEntries(waitlistId: string): readonly WaitlistEntry[];
  countEntries(waitlistId: string): number;

  // Invites
  getInvite(id: string): Invite | undefined;
  getInviteByToken(token: string): Invite | undefined;
  saveInvite(invite: Invite): void;
  listInvitesByEntry(entryId: string): readonly Invite[];
}

export function createInMemoryWaitlistStore(): WaitlistStore {
  const waitlists = new Map<string, Waitlist>();
  const entries = new Map<string, WaitlistEntry>();
  const invites = new Map<string, Invite>();

  return {
    getWaitlist: (id) => waitlists.get(id),
    getWaitlistBySlug: (slug) => [...waitlists.values()].find((w) => w.slug === slug),
    saveWaitlist: (w) => { waitlists.set(w.id, w); },
    listWaitlists: () => [...waitlists.values()],

    getEntry: (id) => entries.get(id),
    getEntryByEmail: (waitlistId, email) =>
      [...entries.values()].find((e) => e.waitlistId === waitlistId && e.email === email),
    getEntryByReferralCode: (code) =>
      [...entries.values()].find((e) => e.referralCode === code),
    saveEntry: (e) => { entries.set(e.id, e); },
    listEntries: (waitlistId) =>
      [...entries.values()]
        .filter((e) => e.waitlistId === waitlistId)
        .sort((a, b) => a.position - b.position),
    countEntries: (waitlistId) =>
      [...entries.values()].filter((e) => e.waitlistId === waitlistId).length,

    getInvite: (id) => invites.get(id),
    getInviteByToken: (token) => [...invites.values()].find((i) => i.token === token),
    saveInvite: (i) => { invites.set(i.id, i); },
    listInvitesByEntry: (entryId) =>
      [...invites.values()].filter((i) => i.entryId === entryId),
  };
}
