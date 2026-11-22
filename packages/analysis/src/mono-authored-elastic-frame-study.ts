import { studyAuthoredElasticFrameCombinationReactions } from "./elastic-frame-authored-combination-reactions.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { buildMonoAuthoredElasticFrameModel } from "./mono-authored-elastic-frame-model.js";

const fields = [
  "modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations", "originNodeId",
] as const;
const exact = (value: unknown): value is Record<typeof fields[number], unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));

/** Solve only the explicit mono family geometry and supplied elastic
 * assumptions and authored load combinations, as a preliminary reaction
 * review. Neither this adapter nor the solver selects design inputs. */
export function studyAuthoredMonoElasticFrameReactions(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot)) {
    throw new Error("Exact authored mono frame, member assignments, supports and load combination fields are required");
  }
  const { modelId, modelRevision, roof, memberAssignments, supports, sources, combinations, originNodeId } = snapshot;
  const frame = buildMonoAuthoredElasticFrameModel({ roof, memberAssignments, supports });
  const result = studyAuthoredElasticFrameCombinationReactions({
    modelId, modelRevision, frame, sources, combinations, originNodeId,
  });
  return {
    ...result,
    family: "mono" as const,
    frame,
    warnings: [
      "The frame uses the authored mono topology, ordered member properties, releases and supports only.",
      "These reaction receipts cover only the authored load combinations; no pressure, sizing, connection or code assumptions are added.",
      "This preliminary review does not authorize fabrication.",
    ] as const,
  };
}
