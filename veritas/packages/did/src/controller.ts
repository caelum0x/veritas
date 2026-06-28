// DID controller authority checks — verifies that a given DID is authorized to control another.
import type { Did } from "./did.js";
import { isDid } from "./did.js";
import type { DidDocument } from "./document.js";

/** Determine whether `controllerDid` is listed as a controller of `doc`. */
export function isController(doc: DidDocument, controllerDid: Did): boolean {
  const { controller } = doc;
  if (!controller) {
    // No explicit controller — the subject DID controls itself.
    return doc.id === controllerDid;
  }
  if (typeof controller === "string") {
    return controller === controllerDid;
  }
  return (controller as readonly string[]).includes(controllerDid);
}

/** Return all controller DIDs listed in the document (including self-control). */
export function getControllers(doc: DidDocument): readonly Did[] {
  const { controller } = doc;
  if (!controller) return [doc.id];
  if (typeof controller === "string") {
    return isDid(controller) ? [controller as Did] : [];
  }
  return (controller as readonly string[]).filter(isDid) as Did[];
}

/** Check if `doc` is self-controlled (no external controller set). */
export function isSelfControlled(doc: DidDocument): boolean {
  const { controller } = doc;
  if (!controller) return true;
  if (typeof controller === "string") return controller === doc.id;
  return (
    (controller as readonly string[]).length === 1 &&
    (controller as readonly string[])[0] === doc.id
  );
}

/**
 * Verify that a DID URL fragment (verification method ID) belongs to a controller.
 * The fragment owner must be a controller of the target document.
 */
export function verificationMethodBelongsToController(
  vmId: string,
  doc: DidDocument,
): boolean {
  // A VM belongs to the document if its ID starts with the document DID.
  const didPrefix = doc.id + "#";
  if (vmId.startsWith(didPrefix)) return true;

  // Or if the VM's controller DID is listed as a controller of the doc.
  const controllers = getControllers(doc);
  const vmDid = vmId.split("#")[0];
  if (!vmDid) return false;
  return controllers.some((c) => c === vmDid);
}

/** Assert that `controllerDid` controls `doc`, returning a descriptive error string on failure. */
export function assertController(
  doc: DidDocument,
  controllerDid: Did,
): { readonly authorized: true } | { readonly authorized: false; readonly reason: string } {
  if (isController(doc, controllerDid)) {
    return { authorized: true };
  }
  return {
    authorized: false,
    reason: `DID ${controllerDid} is not a controller of ${doc.id}`,
  };
}
