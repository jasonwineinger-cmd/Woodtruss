import { bindAuthoredFrameSectionCutSelection } from "./authored-frame-section-cut-selection.js";
import type { buildMonoAuthoredElasticFrameModel } from "./mono-authored-elastic-frame-model.js";

/** Bind exact mono case and directed member cut identities. */
export function bindMonoSectionCutSelection(
  frame: ReturnType<typeof buildMonoAuthoredElasticFrameModel>, caseIds: readonly string[], caseCuts: unknown,
) {
  return bindAuthoredFrameSectionCutSelection(frame, caseIds, caseCuts,
    message => new Error(`Mono section-cut selection: ${message}`));
}
