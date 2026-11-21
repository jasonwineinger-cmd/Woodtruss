import {
  comparePreliminaryMaterialsRevisions, parsePreliminaryMaterialsSnapshot, type PreliminaryMaterialsRevisionComparison,
} from "./preliminary-materials-revisions.js";
import type {PreliminaryReviewHandoffEvidence} from "./preliminary-review-handoff.js";
import {verifyPreliminarySchematicReview, type PreliminarySchematicReview} from "./preliminary-schematic-review.js";

export interface PreliminarySchematicComparisonInput {
  readonly savedSchematic: unknown;
  /** Expected identity must come from the trusted review job, never the supplied drawing. */
  readonly evidence: PreliminaryReviewHandoffEvidence;
}

export interface PreliminarySchematicComparison {
  readonly schemaVersion: "woodtruss.preliminary-schematic-comparison.v1";
  readonly designId: string;
  readonly from: PreliminarySchematicReview;
  readonly to: PreliminarySchematicReview;
  readonly joints: PreliminaryMaterialsRevisionComparison["joints"];
  readonly members: PreliminaryMaterialsRevisionComparison["members"];
  readonly modelDecision: "SCHEMATIC_MODEL_CHANGED" | "NO_SCHEMATIC_MODEL_CHANGE";
  readonly normalizedDrawingDecision: "NORMALIZED_DRAWINGS_DIFFER" | "NORMALIZED_DRAWINGS_MATCH";
  readonly status: "PRELIMINARY_NOT_ENGINEERED";
  readonly notice: "PRELIMINARY - NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
}

/** Verify each view independently. Identical viewport drawings cannot clear model changes. */
export async function comparePreliminarySchematicReviews(
  from: PreliminarySchematicComparisonInput, to: PreliminarySchematicComparisonInput,
): Promise<PreliminarySchematicComparison> {
  const before = parsePreliminaryMaterialsSnapshot(from.evidence.snapshot);
  const after = parsePreliminaryMaterialsSnapshot(to.evidence.snapshot);
  const model = comparePreliminaryMaterialsRevisions(before, after);
  // Render/replay from the exact frozen snapshots used above, never a second read of mutable inputs.
  const [fromView, toView] = await Promise.all([
    verifyPreliminarySchematicReview(from.savedSchematic, {
      snapshot: before, traceabilityManifest: from.evidence.traceabilityManifest, expected: from.evidence.expected,
    }),
    verifyPreliminarySchematicReview(to.savedSchematic, {
      snapshot: after, traceabilityManifest: to.evidence.traceabilityManifest, expected: to.evidence.expected,
    }),
  ]);
  const changed = [model.joints, model.members].some(group =>
    group.addedIds.length > 0 || group.removedIds.length > 0 || group.changedIds.length > 0);
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-schematic-comparison.v1",
    designId: model.designId, from: fromView, to: toView, joints: model.joints, members: model.members,
    modelDecision: changed ? "SCHEMATIC_MODEL_CHANGED" : "NO_SCHEMATIC_MODEL_CHANGE",
    normalizedDrawingDecision: fromView.drawingSvg === toView.drawingSvg ? "NORMALIZED_DRAWINGS_MATCH" : "NORMALIZED_DRAWINGS_DIFFER",
    status: "PRELIMINARY_NOT_ENGINEERED", notice: "PRELIMINARY - NOT FOR FABRICATION", fabricationAuthorized: false,
  });
}
