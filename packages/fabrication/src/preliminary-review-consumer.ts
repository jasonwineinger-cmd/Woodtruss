import {
  verifyPreliminaryReviewHandoff, type PreliminaryReviewHandoff, type PreliminaryReviewHandoffEvidence,
} from "./preliminary-review-handoff.js";

export interface PreliminaryReviewConsumerExpectation {
  /** The downstream review job must explicitly opt into a supported schema and purpose. */
  readonly schemaVersion: string;
  readonly purpose: string;
  readonly designId: string;
  readonly revisionId: string;
  readonly sourceGeometrySha256: string;
  readonly traceabilityManifestSha256: string;
}

type QuarantineReason = "UNSUPPORTED_CONSUMER_SCHEMA" | "UNSUPPORTED_CONSUMER_PURPOSE" | "INVALID_EXPECTATION" |
  "INVALID_HANDOFF_SHAPE" | "UNSUPPORTED_HANDOFF_SCHEMA" | "UNSAFE_HANDOFF_SCOPE" | "IDENTITY_MISMATCH" | "REPLAY_FAILED";

export type PreliminaryReviewConsumerDecision = Readonly<{
  schemaVersion: "woodtruss.preliminary-review-consumer-decision.v1";
  fabricationAuthorized: false;
  notice: "NOT FOR FABRICATION";
} & ({
  decision: "VERIFIED_REVIEW_IDENTITY";
  handoff: PreliminaryReviewHandoff;
} | {
  decision: "QUARANTINED";
  reason: QuarantineReason;
})>;

const schema = "woodtruss.preliminary-review-handoff.v1";
const purpose = "EXTERNAL_REVIEW_IDENTITY_ONLY";
const keys = [
  "schemaVersion", "designId", "revisionId", "sourceGeometrySha256", "traceabilityManifestSha256",
  "status", "useScope", "blockedUse", "notice", "fabricationAuthorized",
] as const;
const base = {
  schemaVersion: "woodtruss.preliminary-review-consumer-decision.v1", fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
} as const;

function quarantine(reason: QuarantineReason): PreliminaryReviewConsumerDecision {
  // Deliberately return no untrusted payload, error string, details, or fallback identity.
  return Object.freeze({...base, decision: "QUARANTINED", reason});
}

function id(v: unknown): boolean {
  return typeof v === "string" && v.length > 0 && v.trim() === v && !/[\u0000-\u001f\u007f]/u.test(v);
}
function sha(v: unknown): boolean {
  return typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
}

/** Fail closed before touching evidence, then replay it before exposing an identity-only handoff.
 * The expectation is trusted review-job context, not copied from the observed handoff.
 */
export async function evaluatePreliminaryReviewHandoff(
  observed: unknown,
  expected: PreliminaryReviewConsumerExpectation,
  trustedEvidence: PreliminaryReviewHandoffEvidence,
): Promise<PreliminaryReviewConsumerDecision> {
  if (!expected) return quarantine("INVALID_EXPECTATION");
  if (expected.schemaVersion !== schema) return quarantine("UNSUPPORTED_CONSUMER_SCHEMA");
  if (expected.purpose !== purpose) return quarantine("UNSUPPORTED_CONSUMER_PURPOSE");
  const {designId, revisionId, sourceGeometrySha256, traceabilityManifestSha256} = expected;
  if (!id(designId) || !id(revisionId) || !sha(sourceGeometrySha256) || !sha(traceabilityManifestSha256))
    return quarantine("INVALID_EXPECTATION");

  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  try {
    if (!observed || typeof observed !== "object" || Object.getPrototypeOf(observed) !== Object.prototype)
      return quarantine("INVALID_HANDOFF_SHAPE");
    descriptors = Object.getOwnPropertyDescriptors(observed);
  } catch {
    return quarantine("INVALID_HANDOFF_SHAPE");
  }
  if (Reflect.ownKeys(descriptors).length !== keys.length ||
      !keys.every(key => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], "value")))
    return quarantine("INVALID_HANDOFF_SHAPE");
  // Take a detached flat snapshot; no re-read of the observed object after preflight.
  const candidate = Object.freeze(Object.fromEntries(keys.map(key => [key, descriptors[key].value as unknown])));
  if (candidate.schemaVersion !== schema) return quarantine("UNSUPPORTED_HANDOFF_SCHEMA");
  if (candidate.useScope !== purpose || candidate.blockedUse !== "NO_STOCK_CUT_PRESS_MACHINE_OR_RELEASE_USE" ||
      candidate.status !== "PRELIMINARY_NOT_ENGINEERED" || candidate.notice !== "NOT FOR FABRICATION" ||
      candidate.fabricationAuthorized !== false)
    return quarantine("UNSAFE_HANDOFF_SCOPE");
  if (candidate.designId !== designId || candidate.revisionId !== revisionId ||
      candidate.sourceGeometrySha256 !== sourceGeometrySha256 ||
      candidate.traceabilityManifestSha256 !== traceabilityManifestSha256)
    return quarantine("IDENTITY_MISMATCH");

  try {
    const handoff = await verifyPreliminaryReviewHandoff(candidate, trustedEvidence);
    return Object.freeze({...base, decision: "VERIFIED_REVIEW_IDENTITY", handoff});
  } catch {
    return quarantine("REPLAY_FAILED");
  }
}
