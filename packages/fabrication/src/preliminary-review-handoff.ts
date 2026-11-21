import {
  verifyPreliminaryMaterialsTraceability,
  type ExpectedPreliminaryMaterialsIdentity,
  type PreliminaryMaterialsTraceabilityManifest,
} from "./preliminary-materials-traceability.js";

export interface PreliminaryReviewHandoffEvidence {
  readonly snapshot: unknown;
  readonly traceabilityManifest: unknown;
  /** Obtain this independently from the trusted review job, not the handoff or supplied manifest. */
  readonly expected: ExpectedPreliminaryMaterialsIdentity;
}

/** Identity and provenance only. This is not a geometry import format or release record. */
export interface PreliminaryReviewHandoff extends ExpectedPreliminaryMaterialsIdentity {
  readonly schemaVersion: "woodtruss.preliminary-review-handoff.v1";
  readonly traceabilityManifestSha256: string;
  readonly status: "PRELIMINARY_NOT_ENGINEERED";
  readonly useScope: "EXTERNAL_REVIEW_IDENTITY_ONLY";
  readonly blockedUse: "NO_STOCK_CUT_PRESS_MACHINE_OR_RELEASE_USE";
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
}

async function manifestSha256(manifest: PreliminaryMaterialsTraceabilityManifest): Promise<string> {
  // Stable UTF-8 encoding for v1 consumers; no reliance on object-key order.
  const bytes = new TextEncoder().encode(JSON.stringify([
    "woodtruss.preliminary-review-handoff.manifest-digest.v1",
    manifest.schemaVersion, manifest.designId, manifest.revisionId, manifest.sourceGeometrySha256,
    manifest.status, manifest.notice, manifest.fabricationAuthorized, manifest.identityBasis,
  ]));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export async function createPreliminaryReviewHandoff(
  evidence: PreliminaryReviewHandoffEvidence,
): Promise<PreliminaryReviewHandoff> {
  const verified = await verifyPreliminaryMaterialsTraceability(
    evidence.snapshot, evidence.traceabilityManifest, evidence.expected,
  );
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-handoff.v1",
    designId: verified.designId,
    revisionId: verified.revisionId,
    sourceGeometrySha256: verified.sourceGeometrySha256,
    traceabilityManifestSha256: await manifestSha256(verified),
    status: "PRELIMINARY_NOT_ENGINEERED",
    useScope: "EXTERNAL_REVIEW_IDENTITY_ONLY",
    blockedUse: "NO_STOCK_CUT_PRESS_MACHINE_OR_RELEASE_USE",
    notice: "NOT FOR FABRICATION",
    fabricationAuthorized: false,
  });
}

/** Verify a persisted handoff by replaying frozen, independently identity-bound evidence.
 * A matching digest is not an authentication signature, engineering decision, or authorization.
 */
export async function verifyPreliminaryReviewHandoff(
  handoff: unknown, trustedEvidence: PreliminaryReviewHandoffEvidence,
): Promise<PreliminaryReviewHandoff> {
  if (!handoff || typeof handoff !== "object" || Object.getPrototypeOf(handoff) !== Object.prototype)
    throw new Error("Expected an external review handoff JSON record");
  const descriptors = Object.getOwnPropertyDescriptors(handoff);
  const canonical = await createPreliminaryReviewHandoff(trustedEvidence);
  const keys = Object.keys(canonical) as Array<keyof PreliminaryReviewHandoff>;
  if (Reflect.ownKeys(descriptors).length !== keys.length ||
      !keys.every(key => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], "value") &&
        descriptors[key].value === canonical[key]))
    throw new Error("Unrecognized or mismatched preliminary review handoff");
  return canonical;
}
