import { studyAuthoredFrameSectionCuts } from "./authored-frame-section-cut-study.js";
import { buildDoubleFinkAuthoredElasticFrameModel } from "./double-fink-authored-elastic-frame-model.js";

/** Preliminary exact cut vectors for the ordinary, eight-panel Double Fink.
 * The result does not provide extrema, connection qualifications or cut instructions. */
export function studyAuthoredDoubleFinkElasticFrameSectionCuts(input: unknown) {
  return studyAuthoredFrameSectionCuts(input, buildDoubleFinkAuthoredElasticFrameModel,
    { family: "common", subtype: "symmetric-double-fink-reference" } as const,
    { study: "Double Fink", selection: "Double Fink" });
}
