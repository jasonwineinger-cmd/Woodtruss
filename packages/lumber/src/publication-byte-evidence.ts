import type { LumberCatalog } from "./catalog.js";
import { reviewLumberReferenceQuantityIntake, type LumberPublicationIntake, type LumberQuantityExpectation,
  type LumberQuantityReceipt } from "./reference-quantity-intake.js";

export interface PrivateLumberPublicationArtifact {
  artifactId: string;
  bytes: Uint8Array;
}
const validDigest = (s: unknown): s is string =>
  typeof s === "string" && /^[a-f0-9]{64}$/u.test(s) && !/^0{64}$/u.test(s);
const validId = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_ARTIFACTS = 32;

/** Read supplied bytes in memory to compare their hashes with independently
 * supplied expectations. No files, network, source reproduction or license checks. */
export async function reviewLumberIntakeWithPrivatePublicationBytes(
  catalog: LumberCatalog, referenceValueId: string, publication: LumberPublicationIntake,
  expected: readonly LumberQuantityExpectation[], receipts: readonly LumberQuantityReceipt[],
  privateArtifacts: readonly PrivateLumberPublicationArtifact[],
) {
  const quantity = reviewLumberReferenceQuantityIntake(catalog,referenceValueId,publication,expected,receipts);
  const outstanding: string[] = [];
  const expectedArtifacts = new Map<string,string>();
  const expectedHashes = new Set<string>();
  if (!publication || !Array.isArray(publication.addenda) || publication.addenda.length >= MAX_ARTIFACTS) {
    outstanding.push("Missing or unsupported Supplement/addenda scope");
  } else {
    for (const artifact of [publication.supplement,...publication.addenda]) {
      if (!artifact || !validId(artifact.id) || !validDigest(artifact.sha256) ||
        expectedArtifacts.has(artifact.id) || expectedHashes.has(artifact.sha256)) {
        outstanding.push("Invalid or duplicate expected publication artifact");
      } else {
        expectedArtifacts.set(artifact.id,artifact.sha256);
        expectedHashes.add(artifact.sha256);
      }
    }
  }
  const observed = new Map<string,Uint8Array>();
  let totalBytes = 0;
  if (!Array.isArray(privateArtifacts) || privateArtifacts.length > MAX_ARTIFACTS) {
    outstanding.push("Missing or unsupported private artifact scope");
  } else {
    for (const entry of privateArtifacts) {
      if (!entry || !expectedArtifacts.has(entry.artifactId)) {
        outstanding.push("Unexpected private publication artifact");
        continue;
      }
      if (observed.has(entry.artifactId)) {
        outstanding.push("Duplicate private publication artifact");
        continue;
      }
      if (!(entry.bytes instanceof Uint8Array) || entry.bytes.byteLength === 0) {
        outstanding.push("Empty or invalid private publication bytes");
        continue;
      }
      observed.set(entry.artifactId,entry.bytes);
      totalBytes += entry.bytes.byteLength;
    }
  }
  if ([...expectedArtifacts.keys()].some(id=>!observed.has(id)))
    outstanding.push("Required Supplement or addendum bytes are missing");
  if (totalBytes > MAX_TOTAL_BYTES) outstanding.push("Private artifact scope exceeds the local byte limit");
  if (outstanding.length === 0) {
    if (!globalThis.crypto?.subtle) outstanding.push("Local SHA-256 verification is unavailable");
    else try {
      // Initiate all digests before yielding to avoid mixed caller-time snapshots.
      // Only hashes, not bytes, cross the await boundary as results.
      const comparisons = await Promise.all([...expectedArtifacts].map(async ([id,sha256]) => {
        const bytes = new Uint8Array(observed.get(id)!);
        const digest = await globalThis.crypto.subtle.digest("SHA-256",bytes);
        const hex = [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
        return hex === sha256;
      }));
      if (comparisons.some(match=>!match)) outstanding.push("Private publication bytes differ from the expected SHA-256");
    } catch {
      outstanding.push("Private publication bytes could not be checked locally");
    }
  }
  const byteMatch = outstanding.length === 0 && expectedArtifacts.size > 0;
  const documented = byteMatch && quantity.documentationStatus === "DOCUMENTED_NOT_VERIFIED";
  return {
    documentationStatus: documented ? "DOCUMENTED_AND_BYTES_MATCH_NOT_VERIFIED" as const : "HOLD_REFERENCE_INTAKE" as const,
    artifactByteStatus: byteMatch ? "MATCHES_EXPECTED_SHA256" as const : "HOLD_ARTIFACT_BYTES" as const,
    quantityDocumentationStatus: quantity.documentationStatus,
    documentedQuantities: documented ? quantity.documentedQuantities : [],
    outstanding:[...outstanding,...quantity.outstanding].sort(),
    publisherEditionIndependentlyVerified:false as const,
    licensedAuthorizationVerified:false as const,
    ndsReady:false as const, approvedForStructuralUse:false as const,
  };
}
