import type { ElasticFrameInput } from "./elastic-frame-solve.js";
import { solveElasticFrame } from "./elastic-frame-solve.js";
import { addElasticFrameHorizontalRestraintForce } from "./elastic-frame-horizontal-restraint-actions.js";
import { solveElasticFrameHorizontalRestraint, type ElasticFrameHorizontalRestraint } from "./elastic-frame-horizontal-restraint-math.js";
import { buildElasticFramePhysicalResultant } from "./elastic-frame-physical-resultant.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";

type Frame = Pick<ElasticFrameInput, "nodes" | "members" | "supports">;
type Actions = Pick<ElasticFrameInput, "loads" | "memberLoads" | "memberPointLoads">;
export type ElasticFrameHorizontalRestraintStudyInput = Actions & {
  modelId: string;
  modelRevision: string;
  caseId: string;
  sourceRef: string;
  frame: Frame;
  bearingNodeId: string;
  originNodeId: string;
  restraint: ElasticFrameHorizontalRestraint;
};
const required = ["modelId", "modelRevision", "caseId", "sourceRef", "frame", "loads", "bearingNodeId", "originNodeId", "restraint"];
const optional = ["memberLoads", "memberPointLoads"];
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const id = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);
const absoluteToleranceIn = 1e-9;
const relativeTolerance = 1e-7;

function verticalDisplacements(
  nodes: Frame["nodes"], solved: ReturnType<typeof solveElasticFrame>["displacements"],
): Readonly<Record<string, number>> {
  const entries = nodes.map(({ id }) => {
    if (!Object.hasOwn(solved, id) || !Number.isFinite(solved[id]?.uyIn)) {
      throw new Error("The exact authored node did not have a usable vertical displacement");
    }
    return [id, solved[id].uyIn] as const;
  });
  return Object.freeze(Object.fromEntries(entries));
}

/** Isolate a single X-restraint hypothesis at an unchanged authored Cartesian
 * roller. The virtual +1 lb case measures flexibility; it is not included in
 * either physical case. The modeled restraint enters the last solve as a
 * clearly identified applied force, not as a substituted actual support. */
export function studyElasticFrameHorizontalRestraint(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  const fields = [...required, ...optional.filter(key => !!snapshot && typeof snapshot === "object" && Object.hasOwn(snapshot, key))];
  if (!exact(snapshot, fields) || ![snapshot.modelId, snapshot.modelRevision, snapshot.caseId,
    snapshot.bearingNodeId, snapshot.originNodeId].every(id) ||
    typeof snapshot.sourceRef !== "string" || !snapshot.sourceRef.trim() || snapshot.sourceRef.length > 1_000 ||
    !exact(snapshot.frame, ["nodes", "members", "supports"])) {
    throw new Error("Exact authored frame, model, case, source, bearing, origin and restraint fields are required");
  }
  const { modelId, modelRevision, caseId, sourceRef, frame, loads, memberLoads, memberPointLoads,
    bearingNodeId, originNodeId, restraint } = snapshot as ElasticFrameHorizontalRestraintStudyInput;
  if (!Array.isArray(frame.supports) || !Array.isArray(frame.nodes) ||
      !frame.nodes.some(node => node?.id === bearingNodeId) || !frame.nodes.some(node => node?.id === originNodeId)) {
    throw new Error("The bearing and origin must reference exact nodes in the authored frame");
  }
  const bearing = frame.supports.filter(support => support?.nodeId === bearingNodeId);
  if (bearing.length !== 1 || !exact(bearing[0], ["nodeId", "fixX", "fixY", "fixRotation"]) ||
      bearing[0].fixX !== false || bearing[0].fixY !== true || bearing[0].fixRotation !== false) {
    throw new Error("The bearing must use one exact Cartesian roller with free X and rotation and fixed Y");
  }
  const actions: Actions = { loads,
    ...(Object.hasOwn(snapshot, "memberLoads") ? { memberLoads } : {}),
    ...(Object.hasOwn(snapshot, "memberPointLoads") ? { memberPointLoads } : {}) };
  const original = solveElasticFrame({ ...frame, ...actions });
  if (!actions.loads.some(row => row.fxLb !== 0 || row.fyLb !== 0 || row.momentLbIn !== 0) &&
      !actions.memberLoads?.some(row => row.qxLbPerIn !== 0 || row.qyLbPerIn !== 0) &&
      !actions.memberPointLoads?.some(row => row.fxLb !== 0 || row.fyLb !== 0)) {
    throw new Error("The original authored case has no nonzero action");
  }
  const force = (fxLb: number) => ({ nodeId: bearingNodeId, fxLb, fyLb: 0, momentLbIn: 0 });
  const sensitivity = solveElasticFrame({ ...frame, loads: [force(1)] });
  const unrestrainedUxIn = original.displacements[bearingNodeId].uxIn;
  const flexibilityInPerLb = sensitivity.displacements[bearingNodeId].uxIn;
  const { predictedUxIn, restraintForceLb } = solveElasticFrameHorizontalRestraint({
    unrestrainedUxIn, flexibilityInPerLb, restraint,
  });
  const injectedRestraintAction = restraintForceLb === 0 ? null : force(restraintForceLb);
  const augmentedActions = injectedRestraintAction
    ? addElasticFrameHorizontalRestraintForce(actions, bearingNodeId, restraintForceLb)
    : actions;
  const restrained = injectedRestraintAction ? solveElasticFrame({ ...frame, ...augmentedActions }) : original;
  const restrainedUxIn = restrained.displacements[bearingNodeId].uxIn;
  const scale = Math.max(Math.abs(unrestrainedUxIn), Math.abs(predictedUxIn), Math.abs(restrainedUxIn));
  const toleranceIn = Math.max(absoluteToleranceIn, relativeTolerance * scale);
  const errorIn = Math.abs(restrainedUxIn - predictedUxIn);
  if (!Number.isFinite(errorIn) || errorIn > toleranceIn) {
    throw new Error("Re-solved bearing displacement disagrees with the predicted restraint response");
  }
  return {
    modelId, modelRevision, caseId, sourceRef, bearingNodeId, originNodeId, restraint: { ...restraint },
    unrestrainedUxIn, flexibilityInPerLb, predictedUxIn, restraintForceLb, restrainedUxIn, injectedRestraintAction,
    // Global signed Y from the two physical solves only, never the virtual
    // +1 lb flexibility solve. A comparison caller can select exact node IDs.
    unrestrainedVerticalDisplacementByNodeIn: verticalDisplacements(frame.nodes, original.displacements),
    restrainedVerticalDisplacementByNodeIn: verticalDisplacements(frame.nodes, restrained.displacements),
    displacementAgreement: { absoluteToleranceIn, relativeTolerance },
    physicalResultant: buildElasticFramePhysicalResultant(frame, augmentedActions, restrained.reactions, originNodeId),
    status: "PRELIMINARY_NOT_ENGINEERED" as const, fabricationAuthorized: false as const,
  };
}
