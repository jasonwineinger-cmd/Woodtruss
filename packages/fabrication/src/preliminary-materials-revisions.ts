import {createPreliminaryMaterialsReport, type PreliminaryMaterialsReport} from "./preliminary-materials.js";

type JointRow = PreliminaryMaterialsReport["joints"][number];
type MemberRow = PreliminaryMaterialsReport["members"][number];
type Changes = { readonly addedIds: readonly string[]; readonly removedIds: readonly string[]; readonly changedIds: readonly string[] };

export interface PreliminaryMaterialsRevisionComparison {
  readonly schemaVersion: "woodtruss.preliminary-materials-comparison.v1";
  readonly designId: string;
  readonly fromRevisionId: string;
  readonly toRevisionId: string;
  readonly status: "PRELIMINARY_NOT_ENGINEERED";
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
  readonly units: {readonly length: "in"};
  readonly joints: Changes;
  readonly members: Changes;
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    throw new Error("Expected a preliminary materials JSON record");
  return value as Record<string, unknown>;
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected a traceability string");
  return value;
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Expected a finite schematic coordinate");
  return value;
}

// Compare exact whitelisted JSON shape, ignoring object-key order but retaining row/tuple order.
function sameShape(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false;
  if (!Array.isArray(a)) { record(a); record(b); }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Reflect.ownKeys(left);
  return keys.length === Reflect.ownKeys(right).length && keys.every(key =>
    typeof key === "string" && Object.hasOwn(right, key) && sameShape(left[key], right[key]));
}

/** Validate and reconstruct a stored v1 JSON report; rejects extra fields and forged dimensions. */
export function parsePreliminaryMaterialsSnapshot(input: unknown): PreliminaryMaterialsReport {
  const snapshot = record(input);
  if (snapshot.schemaVersion !== "woodtruss.preliminary-materials.v1" ||
      snapshot.status !== "PRELIMINARY_NOT_ENGINEERED" || snapshot.notice !== "NOT FOR FABRICATION" ||
      snapshot.fabricationAuthorized !== false)
    throw new Error("Unsupported or unsafe preliminary materials snapshot");
  if (!Array.isArray(snapshot.joints) || !Array.isArray(snapshot.members))
    throw new Error("Missing preliminary materials rows");

  const nodes = snapshot.joints.map((value: unknown) => {
    const joint = record(value);
    return {id: string(joint.jointId), x: number(joint.xIn), y: number(joint.yIn)};
  });
  const bars = snapshot.members.map((value: unknown) => {
    const member = record(value);
    const ends = member.endJointIds;
    if (!Array.isArray(ends) || ends.length !== 2) throw new Error("Invalid member endpoint tuple");
    return {id: string(member.memberId), a: string(ends[0]), b: string(ends[1])};
  });
  const canonical = createPreliminaryMaterialsReport(string(snapshot.designId), string(snapshot.revisionId), {nodes, bars});
  if (!sameShape(snapshot, canonical)) throw new Error("Preliminary materials snapshot differs from canonical v1");
  return canonical;
}

function changes<T>(
  from: ReadonlyArray<T>, to: ReadonlyArray<T>, id: (r: T) => string, same: (a: T, b: T) => boolean,
): Changes {
  const before = new Map(from.map(r => [id(r), r] as const)), after = new Map(to.map(r => [id(r), r] as const));
  return Object.freeze({
    addedIds: Object.freeze([...after.keys()].filter(key => !before.has(key))),
    removedIds: Object.freeze([...before.keys()].filter(key => !after.has(key))),
    changedIds: Object.freeze([...after.keys()].filter(key => before.has(key) && !same(before.get(key)!, after.get(key)!))),
  });
}

/** Compare distinct, explicitly ordered revisions of one design. Not an engineering change order. */
export function comparePreliminaryMaterialsRevisions(fromSnapshot: unknown, toSnapshot: unknown): PreliminaryMaterialsRevisionComparison {
  const from = parsePreliminaryMaterialsSnapshot(fromSnapshot);
  const to = parsePreliminaryMaterialsSnapshot(toSnapshot);
  if (from.designId !== to.designId) throw new Error("Cannot compare different designs");
  if (from.revisionId === to.revisionId) throw new Error("Distinct revision identifiers are required");

  const oldJoints = new Map(from.joints.map(j => [j.jointId, j])), newJoints = new Map(to.joints.map(j => [j.jointId, j]));
  const samePoint = (a: JointRow, b: JointRow) => a.xIn === b.xIn && a.yIn === b.yIn;
  const sameMember = (a: MemberRow, b: MemberRow) =>
    a.centerlineLengthIn === b.centerlineLengthIn &&
    a.endJointIds.every((id, i) => id === b.endJointIds[i] && samePoint(oldJoints.get(id)!, newJoints.get(id)!));

  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-materials-comparison.v1",
    designId: from.designId, fromRevisionId: from.revisionId, toRevisionId: to.revisionId,
    status: "PRELIMINARY_NOT_ENGINEERED", notice: "NOT FOR FABRICATION", fabricationAuthorized: false,
    units: from.units,
    joints: changes(from.joints, to.joints, r => r.jointId, samePoint),
    members: changes(from.members, to.members, r => r.memberId, sameMember),
  });
}
