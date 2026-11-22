import {
  buildAuthoredElasticFrameLoadCombinations,
  type AuthoredElasticFrameLoadCombinationsInput,
} from "./elastic-frame-authored-load-combinations.js";
import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { buildElasticFramePhysicalResultant } from "./elastic-frame-physical-resultant.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { solveElasticFrame, type ElasticFrameInput } from "./elastic-frame-solve.js";

export type AuthoredElasticFrameCombinationReactionsInput = AuthoredElasticFrameLoadCombinationsInput & {
  frame: Pick<ElasticFrameInput, "nodes" | "members" | "supports">;
  originNodeId: string;
};
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));

/** Solve each explicitly weighted case once on the same detached source model
 * and reconstruct independent physical force/moment receipts about the named
 * origin. No cached results, automatic factors, rectangle or approval. */
export function studyAuthoredElasticFrameCombinationReactions(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot, ["modelId", "modelRevision", "frame", "sources", "combinations", "originNodeId"]) ||
      !exact(snapshot.frame, ["nodes", "members", "supports"]) ||
      typeof snapshot.originNodeId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(snapshot.originNodeId)) {
    throw new Error("Exact authored frame, load combination inputs and origin node ID are required; computed results are not accepted");
  }
  // Existing builders validate the weighted actions and exact solver input
  // semantics after the bounded snapshot has excluded non-data values.
  const { modelId, modelRevision, frame, sources, combinations, originNodeId } =
    snapshot as AuthoredElasticFrameCombinationReactionsInput;
  const authored = buildAuthoredElasticFrameLoadCombinations({ modelId, modelRevision, sources, combinations });
  const cases = authored.cases.map(({ caseId, ...actions }, index) => {
    try {
      const { reactions } = solveElasticFrame({ ...frame, ...actions });
      // The first solve has validated the shared frame geometry. Check even
      // unused authored sources before returning any physical receipt.
      if (index === 0) assertElasticFrameAuthoredSourceTargets(frame, sources);
      return { caseId, ...buildElasticFramePhysicalResultant(frame, actions, reactions, originNodeId) };
    } catch (error) {
      throw new Error(`Authored frame reaction case ${caseId} failed: ${error instanceof Error ? error.message : "invalid elastic frame result"}`,
        { cause: error });
    }
  });
  return { modelId, modelRevision, combinationProvenance: authored.provenance, cases,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, fabricationAuthorized: false as const };
}
