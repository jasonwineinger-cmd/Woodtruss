import type {PreliminaryReviewChecklist} from "./preliminary-review-checklist.js";
import {
  verifyPreliminaryReviewReceipt, type PreliminaryReviewReceiptEvidence, type PreliminaryReviewReceipt,
} from "./preliminary-review-receipt.js";

type ClosureState = "REVIEW_CHECKS_PENDING" | "ALL_CHECKS_ACKNOWLEDGED_NOT_APPROVED" | "NO_CHECKS_LISTED_NOT_APPROVED";

export interface PreliminaryReviewClosure {
  readonly schemaVersion: "woodtruss.preliminary-review-closure.v1";
  readonly designId: string;
  readonly fromRevisionId: string;
  readonly toRevisionId: string;
  readonly checklistSha256: string;
  readonly useScope: PreliminaryReviewReceipt["useScope"];
  readonly state: ClosureState;
  readonly checklistItemCount: number;
  readonly acknowledgedItemCount: number;
  readonly pendingChecks: PreliminaryReviewReceipt["pendingChecks"];
  readonly exclusions: PreliminaryReviewChecklist["excluded"];
  readonly reviewerIdentityVerified: false;
  readonly engineeringSignoffVerified: false;
  readonly fabricationAuthorized: false;
  readonly notice: "ACKNOWLEDGMENT ONLY - NOT FOR FABRICATION";
}

/** Produce the current operator summary for the exact receipt and original acknowledgment.
 * Closure of this checklist records an attestation only, never engineering or production approval.
 */
export async function summarizePreliminaryReviewClosure(
  savedReceipt: unknown, evidence: PreliminaryReviewReceiptEvidence, originalAcknowledgment: unknown,
): Promise<PreliminaryReviewClosure> {
  const receipt = await verifyPreliminaryReviewReceipt(savedReceipt, evidence, originalAcknowledgment);
  const acknowledgedItemCount = receipt.acknowledgedChecks.length;
  const checklistItemCount = acknowledgedItemCount + receipt.pendingChecks.length;
  const state: ClosureState = receipt.pendingChecks.length > 0 ? "REVIEW_CHECKS_PENDING" :
    checklistItemCount > 0 ? "ALL_CHECKS_ACKNOWLEDGED_NOT_APPROVED" : "NO_CHECKS_LISTED_NOT_APPROVED";

  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-closure.v1",
    designId: receipt.designId, fromRevisionId: receipt.fromRevisionId, toRevisionId: receipt.toRevisionId,
    checklistSha256: receipt.checklistSha256, useScope: receipt.useScope,
    state, checklistItemCount, acknowledgedItemCount, pendingChecks: receipt.pendingChecks,
    exclusions: Object.freeze(["STRUCTURAL_SIGNOFF", "STOCK_AND_CUTS", "PRESS_MACHINE_AND_RELEASE"] as const),
    reviewerIdentityVerified: false, engineeringSignoffVerified: false, fabricationAuthorized: false,
    notice: "ACKNOWLEDGMENT ONLY - NOT FOR FABRICATION",
  });
}

function matches(expected: unknown, observed: unknown): boolean {
  if (expected === observed) return true;
  if (!expected || !observed || typeof expected !== "object" || typeof observed !== "object" ||
      Object.getPrototypeOf(expected) !== Object.getPrototypeOf(observed)) return false;
  const keys = Reflect.ownKeys(expected);
  const descriptors = Object.getOwnPropertyDescriptors(observed);
  return keys.length === Reflect.ownKeys(descriptors).length && keys.every(key =>
    typeof key === "string" && Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], "value") &&
    matches((expected as Record<string, unknown>)[key], descriptors[key].value));
}

/** Never accept a saved summary as authority or as a substitute for current, paired evidence. */
export async function verifyPreliminaryReviewClosure(
  savedSummary: unknown, savedReceipt: unknown, evidence: PreliminaryReviewReceiptEvidence, originalAcknowledgment: unknown,
): Promise<PreliminaryReviewClosure> {
  const local = await summarizePreliminaryReviewClosure(savedReceipt, evidence, originalAcknowledgment);
  if (!matches(local, savedSummary)) throw new Error("Closure summary does not match the verified review receipt");
  return local;
}
