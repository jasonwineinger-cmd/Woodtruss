import { buildAuthoredElasticFrameLoadCombinations, type AuthoredElasticFrameLoadCombinationsInput }
  from "./elastic-frame-authored-load-combinations.js";
import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { studyElasticFrameHorizontalRestraint } from "./elastic-frame-horizontal-restraint-study.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { buildScissorAuthoredElasticFrameModel } from "./scissor-authored-elastic-frame-model.js";
import { bindScissorModeledThreeGauges, projectScissorModeledThreeGauges } from "./scissor-modeled-three-gauge-projection.js";

const fields = ["modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations",
  "bearingNodeId", "originNodeId", "restraint", "gauges"] as const;
const exact = (value: unknown): value is Record<typeof fields[number], unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) && Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const bearingIds = ["L", "E"] as const;

/** A modeled, not observed, narrow scissor review. Every case uses the same
 * directed geometry, three signed vertical gauge projections and authored
 * horizontal restraint. No comparison to test measurements or fitted values. */
export function studyScissorModeledThreeGaugeRestraint(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot)) throw new Error("Exact modeled scissor three-gauge restraint study fields are required");
  const {
    modelId, modelRevision, roof, memberAssignments, supports, sources, combinations,
    bearingNodeId, originNodeId, restraint, gauges,
  } = snapshot;
  if (!Array.isArray(combinations) || combinations.length < 1 || combinations.length > 8) {
    throw new Error("One to eight explicit weighted scissor cases are required");
  }
  if (bearingNodeId !== "L" && bearingNodeId !== "E") {
    throw new Error("Horizontal restraint must identify an exact original L or E scissor bearing");
  }
  const boundGauges = bindScissorModeledThreeGauges(gauges);
  const frame = buildScissorAuthoredElasticFrameModel({ roof, memberAssignments, supports });
  const request = { modelId, modelRevision, sources, combinations } as AuthoredElasticFrameLoadCombinationsInput;
  const authored = buildAuthoredElasticFrameLoadCombinations(request);
  assertElasticFrameAuthoredSourceTargets(frame, request.sources);
  const states = authored.cases.map(({ caseId, ...actions }, index) => {
    const sourceRef = authored.provenance[index].sourceRef;
    try {
      const result = studyElasticFrameHorizontalRestraint({
        modelId, modelRevision, caseId, sourceRef, frame, ...actions, bearingNodeId, originNodeId, restraint,
      });
      const unrestrained = projectScissorModeledThreeGauges(boundGauges, result.unrestrainedVerticalDisplacementByNodeIn);
      const restrained = projectScissorModeledThreeGauges(boundGauges, result.restrainedVerticalDisplacementByNodeIn);
      const supportRows = result.physicalResultant.supportRows;
      if (supportRows.length !== bearingIds.length) throw new Error("Expected exactly the two original scissor bearing reactions");
      const bearingVerticalReactionsLb = bearingIds.map(nodeId => {
        const at = supportRows.find(row => row.nodeId === nodeId);
        if (!at || !Number.isFinite(at.fyLb)) throw new Error("Missing exact signed vertical bearing reaction");
        return { nodeId, fyLb: at.fyLb };
      });
      const totalBearingReactionLb = bearingVerticalReactionsLb[0].fyLb + bearingVerticalReactionsLb[1].fyLb;
      if (!Number.isFinite(totalBearingReactionLb)) throw new Error("Signed vertical bearing total is outside the usable numeric range");
      return { scope: { bearingNodeId: result.bearingNodeId, originNodeId: result.originNodeId, restraint: result.restraint },
        row: { caseId, unrestrained, restrained, bearingVerticalReactionsLb,
          totalBearingReactionLb: totalBearingReactionLb === 0 ? 0 : totalBearingReactionLb,
          restraintForceLb: result.restraintForceLb } };
    } catch (error) {
      throw new Error(`Modeled scissor case ${caseId} failed: ${error instanceof Error ? error.message : "invalid review result"}`,
        { cause: error });
    }
  });
  return {
    modelId: authored.modelId, modelRevision: authored.modelRevision, family: "scissor" as const,
    // A nonempty set of checked responses used this exact common restraint and origin.
    ...states[0].scope, caseProvenance: authored.provenance, rows: states.map(state => state.row),
    status: "PRELIMINARY_MODELED_NOT_OBSERVED" as const, fabricationAuthorized: false as const,
  };
}
