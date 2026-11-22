import { bindRectangularFrameSection } from "../../lumber/src/rectangular-frame-section-binding.js";
import { studyPreliminaryRectangularSection } from "../../lumber/src/rectangular-section-mechanics.js";
import { elasticFrameRectangularStressStations } from "./elastic-frame-rectangular-stress-stations.js";
import { recoverElasticFrameSectionDemand, type ElasticFrameSectionDemand, type ElasticFrameSectionDemandInput } from "./elastic-frame-section-demand.js";

export type ElasticFrameRectangularStressExtremaInput = ElasticFrameSectionDemandInput & {
  rectangle: { actualWidthIn: number; actualDepthIn: number };
  modeledAreaIn2: number;
  modeledSecondMomentIn4: number;
};
export type ElasticFrameRectangularStressExtremum = ElasticFrameSectionDemand & { normalStressPsi: number };
const exact = (value: unknown, keys: readonly string[]) =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function signedExtrema(rows: readonly ElasticFrameRectangularStressExtremum[]) {
  let min = rows[0], max = rows[0];
  if (!min) throw new Error("Rectangular stress extrema require exact member cut samples");
  for (const row of rows) {
    if (row.normalStressPsi < min.normalStressPsi) min = row;
    if (row.normalStressPsi > max.normalStressPsi) max = row;
  }
  return { min, max };
}

/** Bounded, local signed normal stresses for one solved ideal rectangle.
 * Evaluate physical coincident N and M at each verified branch candidate,
 * endpoint, and point-load side; never combine separate N and M extrema.
 * V remains a companion force only. No shear stress, interaction, or approval. */
export function recoverElasticFrameRectangularStressExtrema(input: ElasticFrameRectangularStressExtremaInput) {
  if (!exact(input, ["lengthIn", "localEndActions", "uniform", "point",
    "rectangle", "modeledAreaIn2", "modeledSecondMomentIn4"]) ||
      !exact(input.rectangle, ["actualWidthIn", "actualDepthIn"])) {
    throw new Error("Unknown or missing rectangular frame stress extrema field");
  }
  const { lengthIn, localEndActions, uniform, point, rectangle, modeledAreaIn2, modeledSecondMomentIn4 } = input;
  const { actualWidthIn, actualDepthIn } = bindRectangularFrameSection({
    actualWidthIn: rectangle.actualWidthIn, actualDepthIn: rectangle.actualDepthIn,
    memberAreaIn2: modeledAreaIn2, memberSecondMomentIn4: modeledSecondMomentIn4,
  });
  const demand = { lengthIn, localEndActions, uniform, point };
  const stations = elasticFrameRectangularStressStations(demand, actualDepthIn);
  const { requestedCuts } = recoverElasticFrameSectionDemand(demand, stations);
  if (requestedCuts.length !== stations.length ||
      !requestedCuts.some(cut => cut.stationIn === 0 && cut.side === "continuous") ||
      !requestedCuts.some(cut => cut.stationIn === lengthIn && cut.side === "continuous") ||
      (point && (!requestedCuts.some(cut => cut.stationIn === point.stationIn && cut.side === "left") ||
                 !requestedCuts.some(cut => cut.stationIn === point.stationIn && cut.side === "right")))) {
    throw new Error("Rectangular stress extrema could not verify every boundary cut");
  }

  const positiveRows: ElasticFrameRectangularStressExtremum[] = [];
  const negativeRows: ElasticFrameRectangularStressExtremum[] = [];
  for (const cut of requestedCuts) {
    const stress = studyPreliminaryRectangularSection({ actualWidthIn, actualDepthIn,
      axialForceLb: cut.axialLb, momentAboutWidthLbIn: cut.momentLbIn, momentAboutDepthLbIn: 0 });
    const plus = stress.peakAxialFiberStresses.find(fiber => fiber.yIn > 0);
    const minus = stress.peakAxialFiberStresses.find(fiber => fiber.yIn < 0);
    if (!plus || !minus) throw new Error("Rectangular stress extreme fibers are outside the usable numeric range");
    positiveRows.push({ ...cut, normalStressPsi: plus.combinedNormalPsi === 0 ? 0 : plus.combinedNormalPsi });
    negativeRows.push({ ...cut, normalStressPsi: minus.combinedNormalPsi === 0 ? 0 : minus.combinedNormalPsi });
  }
  return {
    positiveDepth: signedExtrema(positiveRows),
    negativeDepth: signedExtrema(negativeRows),
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
  };
}
