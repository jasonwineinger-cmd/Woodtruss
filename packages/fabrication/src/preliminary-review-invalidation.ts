import {preparePreliminaryReviewReceipt, verifyPreliminaryReviewReceipt, type PreliminaryReviewReceiptEvidence} from "./preliminary-review-receipt.js";

type Prompt = Awaited<ReturnType<typeof preparePreliminaryReviewReceipt>>;
type Check = Prompt["checks"][number];
type Pending = Readonly<{
  code: Check["code"];
  ids: Check["ids"];
  reason: "NEW_OR_PREVIOUSLY_PENDING" | "CHANGED_IDS_REVIEW_REQUIRED" | "SAME_IDS_REACK_REQUIRED";
}>;

export interface PreliminaryReviewInvalidation {
  readonly schemaVersion: "woodtruss.preliminary-review-invalidation.v1";
  readonly useScope: Prompt["useScope"];
  readonly designId: string;
  readonly priorTargetRevisionId: string;
  readonly nextTargetRevisionId: string;
  readonly priorChecklistSha256: string;
  readonly nextChecklistSha256: string;
  readonly pendingChecks: readonly Pending[];
  readonly acknowledgmentCarryForward: false;
  readonly engineeringSignoffVerified: false;
  readonly fabricationAuthorized: false;
  readonly notice: "NOT FOR FABRICATION";
}

/**
 * Review sessions are independent even if the same IDs reappear. Previous
 * self-attested checks explain what needs re-acknowledgment; they cannot clear it.
 */
export async function planPreliminaryReviewInvalidation(
  previousReceipt: unknown, previousEvidence: PreliminaryReviewReceiptEvidence, previousAcknowledgment: unknown,
  nextEvidence: PreliminaryReviewReceiptEvidence,
): Promise<PreliminaryReviewInvalidation> {
  // Reconcile the next target identity against the prompt created from the same evidence.
  const nextView = nextEvidence.to;
  const {designId: nextDesign, revisionId: nextRevision, sourceGeometrySha256} = nextView.evidence.expected;
  const sameNextIdentity: PreliminaryReviewReceiptEvidence = {
    checklist: nextEvidence.checklist, from: nextEvidence.from,
    to: {savedSchematic: nextView.savedSchematic, evidence: {
      snapshot: nextView.evidence.snapshot, traceabilityManifest: nextView.evidence.traceabilityManifest,
      expected: {designId: nextDesign, revisionId: nextRevision, sourceGeometrySha256},
    }},
  };
  const [prior, next] = await Promise.all([
    verifyPreliminaryReviewReceipt(previousReceipt, previousEvidence, previousAcknowledgment),
    preparePreliminaryReviewReceipt(sameNextIdentity),
  ]);
  if (prior.designId !== nextDesign) throw new Error("Cannot carry context across designs");
  if (prior.toRevisionId === nextRevision) throw new Error("A different target revision is required");
  if (prior.useScope !== next.useScope) throw new Error("Mismatched offline review scope");

  const accepted = new Map(prior.acknowledgedChecks.map(c => [c.code, c]));
  const pendingChecks = next.checks.map((check): Pending => {
    const acknowledged = accepted.get(check.code);
    const reason = !acknowledged ? "NEW_OR_PREVIOUSLY_PENDING" :
      acknowledged.ids.length === check.ids.length && acknowledged.ids.every((id,i) => id === check.ids[i])
        ? "SAME_IDS_REACK_REQUIRED" : "CHANGED_IDS_REVIEW_REQUIRED";
    return Object.freeze({code: check.code, ids: check.ids, reason});
  });
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-invalidation.v1", useScope: next.useScope,
    designId: prior.designId, priorTargetRevisionId: prior.toRevisionId, nextTargetRevisionId: nextRevision,
    priorChecklistSha256: prior.checklistSha256, nextChecklistSha256: next.checklistSha256,
    pendingChecks: Object.freeze(pendingChecks), acknowledgmentCarryForward: false,
    engineeringSignoffVerified: false, fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
  });
}
