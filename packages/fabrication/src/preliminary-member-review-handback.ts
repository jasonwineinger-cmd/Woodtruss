import {tracePreliminaryMembers, type PreliminaryMemberTrace} from "./preliminary-member-trace.js";
import {summarizePreliminaryReviewClosure, type PreliminaryReviewClosure} from "./preliminary-review-closure.js";
import {verifyPreliminaryReviewChecklist} from "./preliminary-review-checklist.js";
import type {PreliminaryReviewReceiptEvidence} from "./preliminary-review-receipt.js";

type MemberHandback = Readonly<PreliminaryMemberTrace["members"][number] & {
  memberChecklistState: "ACKNOWLEDGED_NOT_APPROVED" | "PENDING_REVIEW" | "NOT_LISTED_IN_MEMBER_CHANGE_CHECK";
}>;

export interface PreliminaryMemberReviewHandback {
  readonly schemaVersion: "woodtruss.preliminary-member-review-handback.v1";
  readonly designId: string;
  readonly prior: PreliminaryMemberTrace["prior"];
  readonly next: PreliminaryMemberTrace["next"];
  readonly checklistSha256: string;
  readonly closureState: PreliminaryReviewClosure["state"];
  readonly members: readonly MemberHandback[];
  readonly pendingChecks: PreliminaryReviewClosure["pendingChecks"];
  readonly exclusions: PreliminaryReviewClosure["exclusions"];
  readonly reviewScope: "SCHEMATIC_MEMBER_TRACE_AND_CHECKLIST_ONLY";
  readonly engineeringSignoffVerified: false;
  readonly fabricationAuthorized: false;
  readonly notice: "NOT FOR FABRICATION";
}

/** Projection of verified change-trace facts and the exact paired review receipt.
 * Member acknowledgment records checklist activity, not connectivity, capacity or approval.
 */
export async function createPreliminaryMemberReviewHandback(
  evidence: PreliminaryReviewReceiptEvidence, savedReceipt: unknown, originalAcknowledgment: unknown,
  memberIds: readonly string[],
): Promise<PreliminaryMemberReviewHandback> {
  const [trace, closure, checklist] = await Promise.all([
    tracePreliminaryMembers(evidence.from.evidence, evidence.to.evidence, memberIds),
    summarizePreliminaryReviewClosure(savedReceipt, evidence, originalAcknowledgment),
    verifyPreliminaryReviewChecklist(evidence.checklist, evidence.from, evidence.to),
  ]);
  if (trace.designId !== closure.designId || trace.prior.revisionId !== closure.fromRevisionId ||
      trace.next.revisionId !== closure.toRevisionId || trace.designId !== checklist.designId ||
      trace.prior.revisionId !== checklist.from.revisionId || trace.next.revisionId !== checklist.to.revisionId ||
      trace.prior.sourceGeometrySha256 !== checklist.from.sourceGeometrySha256 ||
      trace.next.sourceGeometrySha256 !== checklist.to.sourceGeometrySha256) throw new Error("Member and checklist revisions differ");
  const pendingMemberIds = new Set(closure.pendingChecks.find(check => check.code === "CHANGED_MEMBER_IDS")?.ids ?? []);
  const listedMemberIds = new Set(checklist.operatorChecks.find(check => check.code === "CHANGED_MEMBER_IDS")?.ids ?? []);
  if (trace.members.some(row => listedMemberIds.has(row.modelMemberId) === (row.relation === "SAME_SCHEMATIC_ENDPOINTS_ONLY")))
    throw new Error("Member trace disagrees with verified change checklist");
  const members = trace.members.map((row): MemberHandback => Object.freeze({
    ...row,
    memberChecklistState: !listedMemberIds.has(row.modelMemberId) ? "NOT_LISTED_IN_MEMBER_CHANGE_CHECK" :
      pendingMemberIds.has(row.modelMemberId) ? "PENDING_REVIEW" : "ACKNOWLEDGED_NOT_APPROVED",
  }));
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-member-review-handback.v1",
    designId: trace.designId, prior: trace.prior, next: trace.next, checklistSha256: closure.checklistSha256,
    closureState: closure.state, members: Object.freeze(members), pendingChecks: closure.pendingChecks,
    exclusions: closure.exclusions, reviewScope: "SCHEMATIC_MEMBER_TRACE_AND_CHECKLIST_ONLY",
    engineeringSignoffVerified: false, fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
  });
}
