import { studyAuthoredElasticFrameCombinationReactions } from "./elastic-frame-authored-combination-reactions.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { buildDoubleFinkAuthoredElasticFrameModel } from "./double-fink-authored-elastic-frame-model.js";

const fields = [
  "modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations", "originNodeId",
] as const;
const exact = (value: unknown): value is Record<typeof fields[number], unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));

/** Review freshly solved authored forces and global moments for the bounded
 * ordinary Double Fink schematic. No supplier drawing is imported. */
export function studyAuthoredDoubleFinkElasticFrameReactions(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot)) {
    throw new Error("Exact authored Double Fink frame, member assignments, supports and load combination fields are required");
  }
  const { modelId, modelRevision, roof, memberAssignments, supports, sources, combinations, originNodeId } = snapshot;
  const frame = buildDoubleFinkAuthoredElasticFrameModel({ roof, memberAssignments, supports });
  const result = studyAuthoredElasticFrameCombinationReactions({
    modelId, modelRevision, frame, sources, combinations, originNodeId,
  });
  return {
    ...result,
    family: "common" as const,
    subtype: "symmetric-double-fink-reference" as const,
    frame,
    warnings: [
      "The ordinary Double Fink schematic does not establish supplier geometry, physical bearing, or restraint details.",
      "Only explicit member properties, supports and authored load combinations are used; there are no site, code, or capacity defaults.",
      "This preliminary review does not authorize fabrication.",
    ] as const,
  };
}
