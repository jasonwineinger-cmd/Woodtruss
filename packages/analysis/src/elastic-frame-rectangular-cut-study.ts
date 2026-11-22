import { bindRectangularFrameSection } from "../../lumber/src/rectangular-frame-section-binding.js";
import { studyPreliminaryRectangularSection } from "../../lumber/src/rectangular-section-mechanics.js";
import type { ElasticFrameSectionDemandCut } from "./elastic-frame-section-demand.js";
import { solveElasticFrame, type ElasticFrameInput } from "./elastic-frame-solve.js";

export type ElasticFrameRectangularCutStudyInput = {
  frame: Omit<ElasticFrameInput, "memberSectionCuts" | "memberDisplacementStations" | "memberDeflectionExtrema">;
  selection: {
    memberId: string;
    cut: ElasticFrameSectionDemandCut;
    rectangle: { actualWidthIn: number; actualDepthIn: number };
  };
};
const exact = (value: unknown, keys: readonly string[]) => !!value && typeof value === "object" &&
  !Array.isArray(value) && Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const requiredFrameFields = ["nodes", "members", "supports", "loads"];
const permittedFrameOptions = ["memberLoads", "memberPointLoads"];

/** Re-solve one explicit frame and report ideal axial+bending normal stress
 * at one signed ordered cut. The transverse shear demand stays in the cut
 * record only. This infers no shear stress, species, capacity or sizing. */
export function studyElasticFrameRectangularCut(input: ElasticFrameRectangularCutStudyInput) {
  if (!exact(input, ["frame", "selection"])) throw new Error("Unknown or missing rectangular cut study field");
  const { frame, selection } = input;
  if (!exact(frame, [...requiredFrameFields, ...permittedFrameOptions.filter(key => frame && Object.hasOwn(frame, key))])) {
    throw new Error("Unknown or missing rectangular cut study frame field; other queries and computed results are not admitted");
  }
  if (!exact(selection, ["memberId", "cut", "rectangle"]) ||
      !exact(selection.cut, ["stationIn", "side"]) ||
      !exact(selection.rectangle, ["actualWidthIn", "actualDepthIn"]) ||
      typeof selection.memberId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(selection.memberId)) {
    throw new Error("Unknown or missing rectangular cut study selection, exact cut or rectangle field");
  }
  const { memberId, cut: request, rectangle } = selection;
  const solution = solveElasticFrame({ ...frame, memberSectionCuts: [{ memberId, cuts: [request] }] });
  const member = frame.members.find(candidate => candidate.id === memberId);
  const actions = Object.hasOwn(solution.memberEndActions, memberId) ? solution.memberEndActions[memberId] : undefined;
  const recovered = Object.hasOwn(solution.memberSectionDemand, memberId) ? solution.memberSectionDemand[memberId] : undefined;
  const cut = recovered?.requestedCuts[0];
  if (!member || !actions || actions.startNodeId !== member.startNodeId || actions.endNodeId !== member.endNodeId ||
      recovered?.requestedCuts.length !== 1 || !cut || cut.stationIn !== request.stationIn || cut.side !== request.side) {
    throw new Error("The exact ordered member and cut could not be recovered from the frame solve");
  }
  const section = bindRectangularFrameSection({
    actualWidthIn: rectangle.actualWidthIn, actualDepthIn: rectangle.actualDepthIn,
    memberAreaIn2: member.areaIn2, memberSecondMomentIn4: member.secondMomentIn4,
  });
  const normalStress = studyPreliminaryRectangularSection({
    actualWidthIn: section.actualWidthIn, actualDepthIn: section.actualDepthIn,
    axialForceLb: cut.axialLb, momentAboutWidthLbIn: cut.momentLbIn, momentAboutDepthLbIn: 0,
  });
  return { memberId, startNodeId: actions.startNodeId, endNodeId: actions.endNodeId, cut, normalStress,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, fabricationAuthorized: false as const };
}
