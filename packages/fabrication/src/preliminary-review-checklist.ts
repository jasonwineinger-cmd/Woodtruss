import {comparePreliminarySchematicReviews, type PreliminarySchematicComparisonInput} from "./preliminary-schematic-comparison.js";

type ReviewRevision = Readonly<{ revisionId: string; sourceGeometrySha256: string; schematicSvgSha256: string }>;
type ChangeCount = Readonly<{ added: number; removed: number; changed: number }>;
type OperatorCheck = Readonly<{
  code: "CHANGED_JOINT_IDS" | "CHANGED_MEMBER_IDS" | "VIEW_MASKS_MODEL_CHANGE";
  ids: readonly string[];
}>;

export interface PreliminaryReviewChecklist {
  readonly schemaVersion: "woodtruss.preliminary-review-checklist.v1";
  readonly designId: string;
  readonly from: ReviewRevision;
  readonly to: ReviewRevision;
  readonly comparison: "NO_SCHEMATIC_CHANGE" | "MODEL_AND_VIEW_CHANGED" | "MODEL_CHANGED_VIEW_MATCHES" | "VIEW_CHANGED_MODEL_MATCHES";
  readonly counts: Readonly<{ joints: ChangeCount; members: ChangeCount }>;
  readonly operatorChecks: readonly OperatorCheck[];
  readonly excluded: readonly ["STRUCTURAL_SIGNOFF", "STOCK_AND_CUTS", "PRESS_MACHINE_AND_RELEASE"];
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
}

/** Build a compact operator checklist after independently replaying both source-bound revisions.
 * It contains identifiers and counts for review, not geometry or a production decision.
 */
export async function createPreliminaryReviewChecklist(
  from: PreliminarySchematicComparisonInput, to: PreliminarySchematicComparisonInput,
): Promise<PreliminaryReviewChecklist> {
  const checked = await comparePreliminarySchematicReviews(from, to);
  const modelChanged = checked.modelDecision === "SCHEMATIC_MODEL_CHANGED";
  const viewChanged = checked.normalizedDrawingDecision === "NORMALIZED_DRAWINGS_DIFFER";
  const project = ({revisionId, sourceGeometrySha256, schematicSvgSha256}: ReviewRevision) =>
    Object.freeze({revisionId, sourceGeometrySha256, schematicSvgSha256});
  const counts = (group: typeof checked.joints) => Object.freeze({
    added: group.addedIds.length, removed: group.removedIds.length, changed: group.changedIds.length,
  });
  const ids = (group: typeof checked.joints) => Object.freeze([...group.addedIds, ...group.removedIds, ...group.changedIds].sort());
  const operatorChecks: OperatorCheck[] = [];
  for (const [code, group] of [["CHANGED_JOINT_IDS", checked.joints], ["CHANGED_MEMBER_IDS", checked.members]] as const) {
    const affected = ids(group);
    if (affected.length) operatorChecks.push(Object.freeze({code, ids: affected}));
  }
  if (modelChanged && !viewChanged) operatorChecks.push(Object.freeze({code: "VIEW_MASKS_MODEL_CHANGE", ids: Object.freeze([])}));
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-checklist.v1",
    designId: checked.designId, from: project(checked.from), to: project(checked.to),
    comparison: modelChanged ? (viewChanged ? "MODEL_AND_VIEW_CHANGED" : "MODEL_CHANGED_VIEW_MATCHES")
      : (viewChanged ? "VIEW_CHANGED_MODEL_MATCHES" : "NO_SCHEMATIC_CHANGE"),
    counts: Object.freeze({joints: counts(checked.joints), members: counts(checked.members)}),
    operatorChecks: Object.freeze(operatorChecks),
    excluded: Object.freeze(["STRUCTURAL_SIGNOFF", "STOCK_AND_CUTS", "PRESS_MACHINE_AND_RELEASE"] as const),
    notice: "NOT FOR FABRICATION", fabricationAuthorized: false,
  });
}

function matches(expected: unknown, observed: unknown): boolean {
  if (expected === observed) return true;
  if (!expected || !observed || typeof expected !== "object" || typeof observed !== "object" ||
      Object.getPrototypeOf(expected) !== Object.getPrototypeOf(observed)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(observed);
  const keys = Reflect.ownKeys(expected);
  return Reflect.ownKeys(descriptors).length === keys.length && keys.every(key =>
    typeof key === "string" && Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], "value") &&
    matches((expected as Record<string, unknown>)[key], descriptors[key].value));
}

/** Reject even self-consistent stale or expanded checklists; return only independently rebuilt data. */
export async function verifyPreliminaryReviewChecklist(
  saved: unknown, from: PreliminarySchematicComparisonInput, to: PreliminarySchematicComparisonInput,
): Promise<PreliminaryReviewChecklist> {
  const checklist = await createPreliminaryReviewChecklist(from, to);
  if (!matches(checklist, saved)) throw new Error("Checklist does not match verified preliminary review evidence");
  return checklist;
}
