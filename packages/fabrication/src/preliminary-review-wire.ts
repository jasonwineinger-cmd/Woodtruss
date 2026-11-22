import {parsePreliminaryMaterialsSnapshot} from "./preliminary-materials-revisions.js";
import {
  evaluatePreliminaryReviewHandoff, type PreliminaryReviewConsumerDecision, type PreliminaryReviewConsumerExpectation,
} from "./preliminary-review-consumer.js";
import {createPreliminaryReviewHandoff, type PreliminaryReviewHandoffEvidence} from "./preliminary-review-handoff.js";

export const PRELIMINARY_REVIEW_WIRE_MAX_BYTES = 4096;
const MAX_REVIEW_PLAN_EXTENT_IN = 50 * 12;
const encoder = new TextEncoder();
// Canonical transport is one UTF-8 JSON object, no BOM or trailing newline, with this exact key order.
const wireKeys = [
  "schemaVersion", "designId", "revisionId", "sourceGeometrySha256", "traceabilityManifestSha256",
  "status", "useScope", "blockedUse", "notice", "fabricationAuthorized",
];

export type PreliminaryReviewWireResult = PreliminaryReviewConsumerDecision | Readonly<{
  schemaVersion: "woodtruss.preliminary-review-wire-quarantine.v1";
  decision: "QUARANTINED";
  reason: "INVALID_WIRE_BYTES" | "NONCANONICAL_WIRE_JSON" | "SOURCE_GEOMETRY_REVIEW_LIMIT_OR_INVALID";
  fabricationAuthorized: false;
  notice: "NOT FOR FABRICATION";
}>;

type WireReason = Extract<PreliminaryReviewWireResult, {schemaVersion: "woodtruss.preliminary-review-wire-quarantine.v1"}>["reason"];
function quarantine(reason: WireReason): PreliminaryReviewWireResult {
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-wire-quarantine.v1", decision: "QUARANTINED", reason,
    fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
  });
}

function boundedEvidence(evidence: PreliminaryReviewHandoffEvidence): PreliminaryReviewHandoffEvidence {
  const snapshot = parsePreliminaryMaterialsSnapshot(evidence.snapshot);
  let minX = Infinity, maxX = -Infinity;
  for (const {xIn} of snapshot.joints) {
    minX = Math.min(minX, xIn);
    maxX = Math.max(maxX, xIn);
  }
  // A conservative schematic horizontal envelope limit, not a design span or supported bearing assertion.
  if (!(maxX - minX <= MAX_REVIEW_PLAN_EXTENT_IN))
    throw new Error("Source schematic exceeds the 50 ft horizontal review envelope");
  return {snapshot, traceabilityManifest: evidence.traceabilityManifest, expected: evidence.expected};
}

/** Publish only the verified identity payload, not the source snapshot or drawing. */
export async function encodePreliminaryReviewWire(evidence: PreliminaryReviewHandoffEvidence): Promise<Uint8Array> {
  const handoff = await createPreliminaryReviewHandoff(boundedEvidence(evidence));
  const bytes = encoder.encode(JSON.stringify(handoff, wireKeys));
  if (bytes.byteLength > PRELIMINARY_REVIEW_WIRE_MAX_BYTES) throw new Error("Review handoff exceeds wire byte limit");
  return bytes;
}

/** Standalone receive boundary. No untrusted bytes or draft input escape a quarantine decision. */
export async function receivePreliminaryReviewWire(
  bytes: Uint8Array, expected: PreliminaryReviewConsumerExpectation, trustedEvidence: PreliminaryReviewHandoffEvidence,
): Promise<PreliminaryReviewWireResult> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > PRELIMINARY_REVIEW_WIRE_MAX_BYTES)
    return quarantine("INVALID_WIRE_BYTES");

  let raw: string;
  try {
    raw = new TextDecoder("utf-8", {fatal: true, ignoreBOM: true}).decode(bytes);
  } catch {
    return quarantine("INVALID_WIRE_BYTES");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || JSON.stringify(parsed, wireKeys) !== raw)
      return quarantine("NONCANONICAL_WIRE_JSON");
  } catch {
    return quarantine("NONCANONICAL_WIRE_JSON");
  }
  let bounded: PreliminaryReviewHandoffEvidence;
  try {
    bounded = boundedEvidence(trustedEvidence);
  } catch {
    return quarantine("SOURCE_GEOMETRY_REVIEW_LIMIT_OR_INVALID");
  }
  return evaluatePreliminaryReviewHandoff(parsed, expected, bounded);
}
