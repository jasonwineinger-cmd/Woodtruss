import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { buildAuthoredElasticFrameLoadCombinations, type AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { solveElasticFrame, type ElasticFrameInput } from "./elastic-frame-solve.js";
import { bindAuthoredFrameSectionCutSelection } from "./authored-frame-section-cut-selection.js";

const fields = ["modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations", "caseCuts"] as const;
type Scope = AuthoredElasticFrameLoadCombinationsInput & Record<typeof fields[number], unknown>;
const exact = (value: unknown): value is Scope => !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));

/** Report one co-located signed internal force vector per chosen cut on each
 * freshly solved explicitly weighted case. No interpolation, section choice,
 * field stresses, material capacity, or release. Cut sides follow the exact
 * weighted physical force, not a source or another case's station. */
export function studyAuthoredFrameSectionCuts<
  Frame extends Pick<ElasticFrameInput, "nodes" | "members" | "supports">,
  Identity extends { readonly family: "mono" | "common"; readonly subtype?: string },
>(
  input: unknown, build: (input: unknown) => Frame, identity: Identity,
  labels: { readonly study: string; readonly selection: string },
) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot)) throw new Error(`Exact authored ${labels.study} model, actions and case-specific cut requests are required`);
  const { modelId, modelRevision, roof, memberAssignments, supports, sources, combinations, caseCuts } = snapshot;
  const frame = build({ roof, memberAssignments, supports });
  const authored = buildAuthoredElasticFrameLoadCombinations({ modelId, modelRevision, sources, combinations });
  const selection = bindAuthoredFrameSectionCutSelection(frame, authored.cases.map(row => row.caseId), caseCuts,
    message => new Error(`${labels.selection} section-cut selection: ${message}`));
  const cases = authored.cases.map(({ caseId, ...actions }, index) => {
    try {
      const { memberCuts: selected } = selection[index];
      const memberSectionCuts = selected.map(({ memberId, cuts }) => ({ memberId, cuts }));
      const solved = solveElasticFrame({ ...frame, ...actions, memberSectionCuts });
      if (index === 0) assertElasticFrameAuthoredSourceTargets(frame, sources);
      const memberCuts = selected.map(({ memberId, startNodeId, endNodeId, cuts }) => {
        const rows = solved.memberSectionDemand[memberId]?.requestedCuts;
        if (!rows || rows.length !== cuts.length || rows.some((row, i) =>
          row.stationIn !== cuts[i].stationIn || row.side !== cuts[i].side ||
          ![row.axialLb, row.shearLb, row.momentLbIn].every(Number.isFinite))) {
          throw new Error("Missing exact co-located solved demand at a selected directed section");
        }
        return { memberId, startNodeId, endNodeId, cuts: rows.map(row => ({ ...row })) };
      });
      return { caseId, memberCuts };
    } catch (error) {
      throw new Error(`Authored ${labels.study} section cut case ${caseId} failed: ${error instanceof Error ? error.message : "invalid elastic frame result"}`,
        { cause: error });
    }
  });
  return {
    ...identity,
    modelId, modelRevision, frame, combinationProvenance: authored.provenance, cases,
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
    warnings: [
      "Each signed vector belongs to one solved case, directed station, and side of a point action; this is not an extrema or capacity result.",
      "These are idealized model demands, not joint qualification, a manufacturing cut location, or fabrication evidence.",
    ] as const,
  };
}
