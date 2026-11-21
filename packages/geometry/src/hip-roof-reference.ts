/** Inches along the long axis (x), short axis (y), and up from the eave plane (z). */
export interface HipReferencePoint { x: number; y: number; z: number }

export interface EqualPitchHipReferenceInput {
  /** Long direction, parallel to the ridge. */
  lengthFt: number;
  /** Short direction, perpendicular to the ridge. */
  widthFt: number;
  pitchRisePer12: number;
  overhangIn?: number;
  heelHeightIn?: number;
}

/**
 * Schematic equal-pitch rectangular hip roof reference only. The four hip
 * lines join ideal eave corners and ridge endpoints; these are not truss
 * members or roof assemblies. Square pyramids, unequal slopes, offsets,
 * overhangs and raised heels are not modeled.
 */
export function generateEqualPitchHipRoofReference(input: EqualPitchHipReferenceInput) {
  const { lengthFt, widthFt, pitchRisePer12 } = input;
  if (![lengthFt,widthFt].every(n => Number.isFinite(n) && n >= 8 && n <= 50))
    throw new Error("Hip reference dimensions must be between 8 and 50 feet");
  if (!Number.isFinite(pitchRisePer12) || pitchRisePer12 <= 0 || pitchRisePer12 > 18)
    throw new Error("Hip reference pitch must be greater than zero and at most 18:12");
  if ((input.overhangIn ?? 0) !== 0 || (input.heelHeightIn ?? 0) !== 0)
    throw new Error("Hip reference overhangs and raised heels are not supported");

  const length = lengthFt * 12;
  const width = widthFt * 12;
  const inset = width / 2;
  const ridgeLength = length - width;
  const rise = inset * (pitchRisePer12 / 12);
  if (ridgeLength <= 1e-6)
    throw new Error("Hip reference requires length greater than width; square pyramids are not supported");
  if (rise <= 1e-6)
    throw new Error("Hip reference rise is too small for nondegenerate geometry");

  const eaveCorners: [HipReferencePoint,HipReferencePoint,HipReferencePoint,HipReferencePoint] = [
    { x:0,y:0,z:0 }, { x:length,y:0,z:0 }, { x:length,y:width,z:0 }, { x:0,y:width,z:0 },
  ];
  const start: HipReferencePoint = { x:inset,y:inset,z:rise };
  const end: HipReferencePoint = { x:length-inset,y:inset,z:rise };
  return {
    kind: "equal-pitch-rectangular-hip-roof-reference" as const,
    units: "in" as const,
    status: "GEOMETRY_ONLY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
    footprintIn: { length,width },
    pitchRisePer12,
    riseIn: rise,
    ridgeInsetIn: inset,
    ridge: { start,end,lengthIn:ridgeLength },
    eaveCorners,
    hipLines: eaveCorners.map((corner,i) => ({ from:corner,to:i===0 || i===3 ? start : end })),
    warnings: ["Ideal roof reference geometry only; not a truss graph, structural model, load path or fabrication drawing."],
  };
}
