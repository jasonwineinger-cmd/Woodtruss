import type {PreliminaryReviewHandoffEvidence} from "./preliminary-review-handoff.js";
import {encodePreliminaryReviewWire, PRELIMINARY_REVIEW_WIRE_MAX_BYTES} from "./preliminary-review-wire.js";

export interface PreliminaryReviewArtifactManifest {
  readonly schemaVersion: "woodtruss.preliminary-review-artifact-manifest.v1";
  readonly artifactKind: "PRELIMINARY_REVIEW_IDENTITY_WIRE";
  readonly contentType: "application/json; charset=utf-8";
  readonly byteLength: number;
  readonly sha256: string;
  readonly fabricationAuthorized: false;
  readonly notice: "NOT FOR FABRICATION";
}

export interface PreliminaryReviewArtifactIntegrity {
  readonly schemaVersion: "woodtruss.preliminary-review-artifact-integrity.v1";
  readonly acceptedEvidence: readonly ["EXACT_BYTE_LENGTH", "SHA256_MATCH"];
  readonly heldEvidence: readonly ["WIRE_SCHEMA_SCOPE_AND_SOURCE_REPLAY", "ENGINEERING_AND_FABRICATION_RELEASE"];
  readonly manifest: PreliminaryReviewArtifactManifest;
  readonly fabricationAuthorized: false;
  readonly notice: "NOT FOR FABRICATION";
}

const keys = [
  "schemaVersion", "artifactKind", "contentType", "byteLength", "sha256", "fabricationAuthorized", "notice",
] as const;
const kind = "PRELIMINARY_REVIEW_IDENTITY_WIRE";
const media = "application/json; charset=utf-8";
const version = "woodtruss.preliminary-review-artifact-manifest.v1";

/** Manifest records a canonical review payload at publishing time, not its filename or filesystem location. */
export async function packagePreliminaryReviewArtifact(
  evidence: PreliminaryReviewHandoffEvidence,
): Promise<Readonly<{bytes: Uint8Array; manifest: PreliminaryReviewArtifactManifest}>> {
  const bytes = await encodePreliminaryReviewWire(evidence);
  // Keep the mutable byte array private until its digest has been taken.
  const manifest = await describe(bytes);
  return Object.freeze({bytes, manifest});
}

async function describe(bytes: Uint8Array): Promise<PreliminaryReviewArtifactManifest> {
  const byteLength = bytes.byteLength;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  const sha256 = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join("");
  return Object.freeze({
    schemaVersion: version, artifactKind: kind, contentType: media, byteLength,
    sha256, fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
  });
}

/** This stage needs no model. The expected manifest must come through an independently trusted path.
 * A pass only proves byte equality to that manifest; a receiver still must replay scope and source.
 */
export async function verifyPreliminaryReviewArtifactBytes(
  bytes: Uint8Array, expectedManifest: unknown,
): Promise<PreliminaryReviewArtifactIntegrity> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > PRELIMINARY_REVIEW_WIRE_MAX_BYTES)
    throw new Error("Invalid preliminary review artifact byte length");
  if (!expectedManifest || typeof expectedManifest !== "object" || Object.getPrototypeOf(expectedManifest) !== Object.prototype)
    throw new Error("Expected a preliminary review artifact manifest");
  const desc = Object.getOwnPropertyDescriptors(expectedManifest);
  if (Reflect.ownKeys(desc).length !== keys.length ||
      !keys.every(key => Object.hasOwn(desc, key) && Object.hasOwn(desc[key], "value")))
    throw new Error("Unexpected preliminary review manifest fields");
  if (desc.schemaVersion.value !== version || desc.artifactKind.value !== kind || desc.contentType.value !== media ||
      desc.fabricationAuthorized.value !== false || desc.notice.value !== "NOT FOR FABRICATION" ||
      typeof desc.sha256.value !== "string" || !/^[a-f0-9]{64}$/u.test(desc.sha256.value))
    throw new Error("Invalid preliminary review artifact manifest");
  const copy = Uint8Array.from(bytes);
  if (copy.byteLength !== bytes.byteLength || desc.byteLength.value !== copy.byteLength)
    throw new Error("Preliminary review artifact byte length mismatch");
  const manifest = await describe(copy);
  if (desc.sha256.value !== manifest.sha256) throw new Error("Preliminary review artifact SHA-256 mismatch");
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-artifact-integrity.v1",
    acceptedEvidence: Object.freeze(["EXACT_BYTE_LENGTH", "SHA256_MATCH"] as const),
    heldEvidence: Object.freeze(["WIRE_SCHEMA_SCOPE_AND_SOURCE_REPLAY", "ENGINEERING_AND_FABRICATION_RELEASE"] as const),
    manifest, fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
  });
}
