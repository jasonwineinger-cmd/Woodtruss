import { generateCommonTopology } from "./topology.js";

export interface AsymmetricCommonTopologyInput {
  spanFt: number;
  /** Rise in inches per 12 inches of horizontal run, measured from each bearing. */
  leftPitchRisePer12: number;
  rightPitchRisePer12: number;
  heelHeightIn?: number;
  overhangIn?: number;
}

/**
 * Map the existing Fink-like graph piecewise on either side of an offset ridge.
 * Both bearings stay level and at the ends of the flat chord; no raised heel,
 * overhang, intermediate support, load or bearing detail is introduced.
 * This only creates centerline reference geometry, not a solver model.
 */
export function generateAsymmetricCommonTopology(input: AsymmetricCommonTopologyInput) {
  const { spanFt,leftPitchRisePer12:leftPitch,rightPitchRisePer12:rightPitch } = input;
  if (![leftPitch,rightPitch].every(v => Number.isFinite(v) && v > 0 && v <= 18))
    throw new Error("Both gable pitches must be greater than zero and at most 18:12");
  if ((input.heelHeightIn ?? 0) !== 0 || (input.overhangIn ?? 0) !== 0)
    throw new Error("Asymmetric gable raised heels and overhangs are unsupported");
  const base = generateCommonTopology({family:"common",spanFt,pitchRisePer12:1});
  const span = spanFt * 12;
  const ridgeX = span * rightPitch / (leftPitch + rightPitch);
  const ridgeY = ridgeX * leftPitch / 12;
  if (Math.min(ridgeX,span-ridgeX,ridgeY) <= 1e-6)
    throw new Error("Asymmetric gable reference would be degenerate");

  const joints = base.joints.map(({id,position}) => {
    // The baseline midpoint and quarter points establish panel fractions,
    // but each side uses its own horizontal run to the shared ridge.
    const t = position.x / span;
    const x = t <= 0.5 ? 2*t*ridgeX : ridgeX + (2*t-1)*(span-ridgeX);
    const y = position.y === 0 ? 0 : t <= 0.5 ? 2*t*ridgeY : (2-2*t)*ridgeY;
    return { id,position:{x,y} };
  });
  return {
    ...base,
    subtype:"asymmetric-gable-reference" as const,
    bearings:{left:"L",right:"E"},
    ridge:{x:ridgeX,y:ridgeY},
    joints,
    pinJointAnalysisAvailable:false as const,
    fabricationAuthorized:false as const,
    warnings:[...base.warnings,"Asymmetric centerline reference only; no solver or fabrication output in this path."],
  };
}
