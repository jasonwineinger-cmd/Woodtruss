import {
  comparePreliminaryMaterialsRevisions, parsePreliminaryMaterialsSnapshot, type PreliminaryMaterialsRevisionComparison,
} from "./preliminary-materials-revisions.js";
import {
  verifyPreliminaryMaterialsTraceability, type ExpectedPreliminaryMaterialsIdentity,
} from "./preliminary-materials-traceability.js";

export interface PreliminaryMaterialsRevisionEvidence {
  readonly snapshot: unknown;
  readonly manifest: unknown;
  /** Must come from independent, trusted review context. Never populate from this evidence itself. */
  readonly expected: ExpectedPreliminaryMaterialsIdentity;
}

export interface PreliminaryMaterialsChangeCatalog {
  readonly schemaVersion: "woodtruss.preliminary-materials-change-catalog.v1";
  readonly designId: string;
  readonly from: Readonly<{revisionId: string; sourceGeometrySha256: string}>;
  readonly to: Readonly<{revisionId: string; sourceGeometrySha256: string}>;
  readonly units: {readonly length: "in"};
  readonly joints: PreliminaryMaterialsRevisionComparison["joints"];
  readonly members: PreliminaryMaterialsRevisionComparison["members"];
  readonly status: "PRELIMINARY_NOT_ENGINEERED";
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
  readonly unresolved: readonly ["MEMBER_CAPACITY", "CONNECTIONS_AND_BEARING", "FABRICATION_AND_MACHINE_OUTPUT"];
}

/** Independently bind and replay both snapshot revisions before publishing any changes.
 * Only schematic IDs are compared; a no-change result does not clear an unresolved item.
 */
export async function createPreliminaryMaterialsChangeCatalog(
  from: PreliminaryMaterialsRevisionEvidence, to: PreliminaryMaterialsRevisionEvidence,
): Promise<PreliminaryMaterialsChangeCatalog> {
  // Parse before either async verification so replay can only use the same frozen inputs.
  const before = parsePreliminaryMaterialsSnapshot(from.snapshot);
  const after = parsePreliminaryMaterialsSnapshot(to.snapshot);
  const [beforeIdentity, afterIdentity] = await Promise.all([
    verifyPreliminaryMaterialsTraceability(before, from.manifest, from.expected),
    verifyPreliminaryMaterialsTraceability(after, to.manifest, to.expected),
  ]);
  const comparison = comparePreliminaryMaterialsRevisions(before, after);
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-materials-change-catalog.v1",
    designId: comparison.designId,
    from: Object.freeze({revisionId: beforeIdentity.revisionId, sourceGeometrySha256: beforeIdentity.sourceGeometrySha256}),
    to: Object.freeze({revisionId: afterIdentity.revisionId, sourceGeometrySha256: afterIdentity.sourceGeometrySha256}),
    units: comparison.units,
    joints: comparison.joints,
    members: comparison.members,
    status: "PRELIMINARY_NOT_ENGINEERED",
    notice: "NOT FOR FABRICATION",
    fabricationAuthorized: false,
    unresolved: Object.freeze(["MEMBER_CAPACITY", "CONNECTIONS_AND_BEARING", "FABRICATION_AND_MACHINE_OUTPUT"] as const),
  });
}

// Validate only inert JSON-shaped data. Do not invoke accessors or accept unknown fields.
function exactJson(actual: unknown, canonical: unknown): boolean {
  if (actual === canonical) return true;
  if (!actual || !canonical || typeof actual !== "object" || typeof canonical !== "object" ||
      Object.getPrototypeOf(actual) !== Object.getPrototypeOf(canonical)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(actual);
  const keys = Reflect.ownKeys(canonical);
  return Reflect.ownKeys(descriptors).length === keys.length && keys.every(key => {
    if (typeof key !== "string" || !Object.hasOwn(descriptors, key)) return false;
    const descriptor = descriptors[key];
    return Object.hasOwn(descriptor, "value") && exactJson(descriptor.value, (canonical as Record<string, unknown>)[key]);
  });
}

/** Reproduce a saved catalog from trusted evidence or reject it. Its own contents grant no authority. */
export async function verifyPreliminaryMaterialsChangeCatalog(
  saved: unknown, from: PreliminaryMaterialsRevisionEvidence, to: PreliminaryMaterialsRevisionEvidence,
): Promise<PreliminaryMaterialsChangeCatalog> {
  const canonical = await createPreliminaryMaterialsChangeCatalog(from, to);
  if (!exactJson(saved, canonical)) throw new Error("Change catalog does not match the bound preliminary revision evidence");
  return canonical;
}
