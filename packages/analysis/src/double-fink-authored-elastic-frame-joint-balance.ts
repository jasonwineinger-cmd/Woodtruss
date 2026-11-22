import { buildDoubleFinkAuthoredElasticFrameModel } from "./double-fink-authored-elastic-frame-model.js";
import { studyAuthoredFrameJointBalance } from "./authored-frame-joint-balance.js";

/** Preliminary joint balance for the ordinary Double Fink reference. */
export function studyAuthoredDoubleFinkElasticFrameJointBalance(input: unknown) {
  return studyAuthoredFrameJointBalance(input, buildDoubleFinkAuthoredElasticFrameModel, {
    subtype: "symmetric-double-fink-reference",
    label: "Double Fink",
    additionalWarnings: [] as const,
  });
}
