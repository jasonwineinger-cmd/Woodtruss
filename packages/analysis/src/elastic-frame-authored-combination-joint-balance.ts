import { runAuthoredFrameJointBalance } from "./authored-frame-joint-balance.js";
import type { AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { exactAuthoredFrameFields, parseExplicitAuthoredFrame } from "./elastic-frame-explicit-authored-input.js";

const fields = ["modelId", "modelRevision", "frame", "sources", "combinations", "caseJoints"] as const;
const fail = (description: string) => new Error(`Authored frame joint balance: ${description}`);

/** Isolated preliminary frame ledger with explicitly authored global Cartesian
 * or inclined restraints. The horizontal coordinate extent is an intake limit,
 * not a physical bearing span or a topology/family qualification. */
export function studyAuthoredElasticFrameCombinationJointBalance(input: unknown) {
  const data = snapshotElasticFrameReviewData(input);
  if (!exactAuthoredFrameFields(data, fields))
    throw fail("exact authored frame, combinations and ordered case joints are required");
  const { modelId, modelRevision, sources, combinations, caseJoints } =
    data as AuthoredElasticFrameLoadCombinationsInput & { caseJoints: unknown };
  const frame = parseExplicitAuthoredFrame(data.frame, fail, "exact authored frame, combinations and ordered case joints are required");
  return runAuthoredFrameJointBalance(frame, {modelId, modelRevision, sources, combinations, caseJoints},
    {label:"Authored frame",additionalWarnings:[
      "The generic model uses only the explicitly authored frame and restraints; it does not establish any truss family or physical support detail.",
    ] as const});
}
