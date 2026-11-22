import { bindAuthoredFrameDisplacementSelection } from "./authored-frame-displacement-selection.js";
import type { buildMonoAuthoredElasticFrameModel } from "./mono-authored-elastic-frame-model.js";

/** Bind exact mono joint and directed member displacement selections. */
export function bindMonoDisplacementSelection(
  frame: ReturnType<typeof buildMonoAuthoredElasticFrameModel>, nodeIds: unknown, memberStations: unknown,
) {
  return bindAuthoredFrameDisplacementSelection(frame, nodeIds, memberStations,
    message => new Error(`Mono displacement selection: ${message}`));
}
