import { buildRaisedHeelCommonAuthoredElasticFrameModel } from "./raised-heel-common-authored-elastic-frame-model.js";
import { studyAuthoredFrameJointBalance } from "./authored-frame-joint-balance.js";

/** Preliminary joint balance for the raised-heel common reference. */
export function studyAuthoredRaisedHeelCommonElasticFrameJointBalance(input: unknown) {
  return studyAuthoredFrameJointBalance(input, buildRaisedHeelCommonAuthoredElasticFrameModel, {
    subtype: "symmetric-raised-heel-reference",
    label: "Raised-heel common",
    additionalWarnings: [
      "Ideal top heel joints HL and HE remain separate from the bottom bearing joints L and E; joint balance does not establish physical heel or bearing details.",
    ] as const,
  });
}
