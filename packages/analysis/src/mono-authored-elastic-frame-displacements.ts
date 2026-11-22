import type { AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { runAuthoredFrameDisplacements } from "./authored-frame-displacement-study.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { buildMonoAuthoredElasticFrameModel } from "./mono-authored-elastic-frame-model.js";

const fields = ["modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations",
  "observedNodeIds", "memberStations"] as const;
type Scope = AuthoredElasticFrameLoadCombinationsInput & Record<typeof fields[number], unknown>;
const exact = (value: unknown): value is Scope => !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));

/** Preliminary exact authored mono displacement review. */
export function studyAuthoredMonoElasticFrameDisplacements(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot)) throw new Error("Exact authored mono model, actions and displacement selections are required");
  const { modelId, modelRevision, roof, memberAssignments, supports, sources, combinations, observedNodeIds, memberStations } = snapshot;
  const frame = buildMonoAuthoredElasticFrameModel({ roof, memberAssignments, supports });
  return {family: "mono" as const,
    ...runAuthoredFrameDisplacements(frame, {modelId, modelRevision, sources, combinations, observedNodeIds, memberStations},
      {study:"mono",selection:"Mono"})};
}
