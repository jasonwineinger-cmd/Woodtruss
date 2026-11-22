import { studyAuthoredFrameSectionCuts } from "./authored-frame-section-cut-study.js";
import { buildMonoAuthoredElasticFrameModel } from "./mono-authored-elastic-frame-model.js";

/** Preliminary exact cut vectors from the authored mono frame and named cases. */
export function studyAuthoredMonoElasticFrameSectionCuts(input: unknown) {
  return studyAuthoredFrameSectionCuts(input, buildMonoAuthoredElasticFrameModel, { family: "mono" } as const,
    { study: "mono", selection: "Mono" });
}
