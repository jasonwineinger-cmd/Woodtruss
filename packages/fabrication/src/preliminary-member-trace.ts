import type {PreliminaryMaterialsReport} from "./preliminary-materials.js";
import {parsePreliminaryMaterialsSnapshot} from "./preliminary-materials-revisions.js";
import {createPreliminaryReviewHandoff, type PreliminaryReviewHandoffEvidence} from "./preliminary-review-handoff.js";

type TraceRelation =
  "ONLY_IN_PRIOR_REVISION" | "ONLY_IN_NEXT_REVISION" | "ENDPOINT_IDENTITIES_CHANGED" |
  "ENDPOINT_ORDER_REVERSED" | "ENDPOINT_COORDINATES_CHANGED" | "SAME_SCHEMATIC_ENDPOINTS_ONLY";
type EndpointPair = PreliminaryMaterialsReport["members"][number]["endJointIds"];
type MemberTrace = Readonly<{
  modelMemberId: string;
  relation: TraceRelation;
  priorEndJointIds: EndpointPair | null;
  nextEndJointIds: EndpointPair | null;
  centerlineLengthUnchanged: boolean | null;
  physicalContinuityVerified: false;
}>;
type Revision = Readonly<{revisionId: string; sourceGeometrySha256: string; traceabilityManifestSha256: string}>;

export interface PreliminaryMemberTrace {
  readonly schemaVersion: "woodtruss.preliminary-member-trace.v1";
  readonly designId: string;
  readonly prior: Revision;
  readonly next: Revision;
  readonly members: readonly MemberTrace[];
  readonly useScope: "SCHEMATIC_MEMBER_TRACE_ONLY";
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
}

/** Compare selected IDs across two verified schematic revisions, not physical part continuity.
 * A member can keep its ID and length yet change endpoints or placement.
 */
export async function tracePreliminaryMembers(
  prior: PreliminaryReviewHandoffEvidence, next: PreliminaryReviewHandoffEvidence, memberIds: readonly string[],
): Promise<PreliminaryMemberTrace> {
  if (!Array.isArray(memberIds) || memberIds.length === 0) throw new Error("Select at least one model member ID");
  const requested = new Set<string>();
  for (const id of memberIds) {
    if (typeof id !== "string" || !id || id.trim() !== id || /[\u0000-\u001f\u007f]/u.test(id) || requested.has(id))
      throw new Error("Invalid or duplicate model member ID");
    requested.add(id);
  }
  const before = parsePreliminaryMaterialsSnapshot(prior.snapshot), after = parsePreliminaryMaterialsSnapshot(next.snapshot);
  const [left, right] = await Promise.all([
    createPreliminaryReviewHandoff({snapshot: before, traceabilityManifest: prior.traceabilityManifest, expected: prior.expected}),
    createPreliminaryReviewHandoff({snapshot: after, traceabilityManifest: next.traceabilityManifest, expected: next.expected}),
  ]);
  if (left.designId !== right.designId) throw new Error("Cannot trace model members across different designs");
  if (left.revisionId === right.revisionId) throw new Error("Distinct revisions are required for member trace");

  const oldMembers = new Map(before.members.map(m => [m.memberId, m])), newMembers = new Map(after.members.map(m => [m.memberId, m]));
  const oldJoints = new Map(before.joints.map(j => [j.jointId, j])), newJoints = new Map(after.joints.map(j => [j.jointId, j]));
  const members = [...requested].sort().map((id): MemberTrace => {
    const old = oldMembers.get(id), current = newMembers.get(id);
    if (!old && !current) throw new Error("Requested member was not found in either verified revision");
    let relation: TraceRelation;
    if (!old) relation = "ONLY_IN_NEXT_REVISION";
    else if (!current) relation = "ONLY_IN_PRIOR_REVISION";
    else if (old.endJointIds[0] === current.endJointIds[1] && old.endJointIds[1] === current.endJointIds[0])
      relation = "ENDPOINT_ORDER_REVERSED";
    else if (!old.endJointIds.every((jointId,i) => jointId === current.endJointIds[i])) relation = "ENDPOINT_IDENTITIES_CHANGED";
    else if (old.endJointIds.some(jointId => {
      const a = oldJoints.get(jointId)!, b = newJoints.get(jointId)!;
      return a.xIn !== b.xIn || a.yIn !== b.yIn;
    })) relation = "ENDPOINT_COORDINATES_CHANGED";
    else relation = "SAME_SCHEMATIC_ENDPOINTS_ONLY";

    return Object.freeze({
      modelMemberId: id, relation, priorEndJointIds: old?.endJointIds ?? null, nextEndJointIds: current?.endJointIds ?? null,
      centerlineLengthUnchanged: old && current ? old.centerlineLengthIn === current.centerlineLengthIn : null,
      physicalContinuityVerified: false,
    });
  });
  const revision = ({revisionId, sourceGeometrySha256, traceabilityManifestSha256}: Revision) =>
    Object.freeze({revisionId, sourceGeometrySha256, traceabilityManifestSha256});
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-member-trace.v1", designId: left.designId, prior: revision(left), next: revision(right),
    members: Object.freeze(members), useScope: "SCHEMATIC_MEMBER_TRACE_ONLY", notice: "NOT FOR FABRICATION", fabricationAuthorized: false,
  });
}
