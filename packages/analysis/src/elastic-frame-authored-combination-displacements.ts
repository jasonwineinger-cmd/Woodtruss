import type { AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { runAuthoredFrameDisplacements } from "./authored-frame-displacement-study.js";
import { exactAuthoredFrameFields, parseExplicitAuthoredFrame } from "./elastic-frame-explicit-authored-input.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";

const fields = ["modelId","modelRevision","frame","sources","combinations","observedNodeIds","memberStations"] as const;
const shapeError = "exact authored frame, combinations and displacement selections are required";
const fail = (description: string) => new Error(`Authored frame displacement: ${description}`);

/** Fresh weighted-case model displacements only, not observations or a
 * physical span check. Global joint motion and local section motion are
 * intentionally reported separately, with no assumed family or support. */
export function studyAuthoredElasticFrameCombinationDisplacements(input: unknown) {
  const data = snapshotElasticFrameReviewData(input);
  if (!exactAuthoredFrameFields(data, fields)) throw fail(shapeError);
  const frame = parseExplicitAuthoredFrame(data.frame, fail, shapeError);
  const {modelId,modelRevision,sources,combinations,observedNodeIds,memberStations} =
    data as AuthoredElasticFrameLoadCombinationsInput & {observedNodeIds:unknown;memberStations:unknown};
  return runAuthoredFrameDisplacements(frame, {modelId,modelRevision,sources,combinations,observedNodeIds,memberStations},
    {study:"frame",selection:"Authored frame"});
}
