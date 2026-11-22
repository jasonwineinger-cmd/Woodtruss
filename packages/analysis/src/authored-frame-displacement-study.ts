import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { buildAuthoredElasticFrameLoadCombinations, type AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { solveElasticFrame, type ElasticFrameInput } from "./elastic-frame-solve.js";
import { bindAuthoredFrameDisplacementSelection } from "./authored-frame-displacement-selection.js";

type FrameInput = Pick<ElasticFrameInput, "nodes" | "members" | "supports">;
type DisplacementInputs = AuthoredElasticFrameLoadCombinationsInput & {
  observedNodeIds: unknown;
  memberStations: unknown;
};

/** One freshly solved state per explicit combination. Joint motion uses global
 * axes while selected member samples use that member's ordered local axes.
 * No measured observations, default stiffness, stress envelope or release. */
export function runAuthoredFrameDisplacements<Frame extends FrameInput>(
  frame: Frame, input: DisplacementInputs,
  labels: { readonly study: string; readonly selection: string },
) {
  const { modelId, modelRevision, sources, combinations, observedNodeIds, memberStations } = input;
  const selection = bindAuthoredFrameDisplacementSelection(frame, observedNodeIds, memberStations,
    message => new Error(`${labels.selection} displacement selection: ${message}`));
  const authored = buildAuthoredElasticFrameLoadCombinations({ modelId, modelRevision, sources, combinations });
  const memberDisplacementStations = selection.members.map(({ memberId, stationsIn }) => ({ memberId, stationsIn }));
  const cases = authored.cases.map(({ caseId, ...actions }, index) => {
    try {
      const solved = solveElasticFrame({ ...frame, ...actions, memberDisplacementStations });
      if (index === 0) assertElasticFrameAuthoredSourceTargets(frame, sources);
      const nodalDisplacements = selection.nodeIds.map(nodeId => {
        const row = solved.displacements[nodeId];
        if (!row || !Number.isFinite(row.uxIn) || !Number.isFinite(row.uyIn) ||
            (row.rotationRad !== null && !Number.isFinite(row.rotationRad)))
          throw new Error("Missing exact finite solved node displacement");
        return { nodeId, ...row };
      });
      const memberDisplacements = selection.members.map(({ memberId, startNodeId, endNodeId, stationsIn }) => {
        const rows = solved.memberSectionDisplacements[memberId];
        if (!rows || rows.length !== stationsIn.length || rows.some((row, i) => row.stationIn !== stationsIn[i] ||
            ![row.axialIn, row.transverseIn, row.rotationRad].every(Number.isFinite)))
          throw new Error("Missing exact finite solved displacement samples at the selected ordered stations");
        return { memberId, startNodeId, endNodeId, samples: rows.map(row => ({ ...row })) };
      });
      return { caseId, nodalDisplacements, memberDisplacements };
    } catch (error) {
      throw new Error(`Authored ${labels.study} displacement case ${caseId} failed: ${error instanceof Error ? error.message : "invalid elastic frame result"}`,
        { cause: error });
    }
  });
  return {
    modelId, modelRevision, frame, combinationProvenance: authored.provenance, cases,
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
    warnings: [
      "Node translations are global; each member sample uses its ordered local axes and its own recovered section rotation.",
      "Selected synthetic or authored cases are not observed deflection, an envelope, a code check or fabrication evidence.",
    ] as const,
  };
}
