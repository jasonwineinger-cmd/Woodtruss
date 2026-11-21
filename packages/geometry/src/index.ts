export type TrussFamily = "common" | "scissor" | "attic" | "mono" | "agricultural";
export interface RoofInput {
  family: TrussFamily;
  spanFt: number;
  pitchRisePer12: number;
  heelHeightIn?: number;
  overhangIn?: number;
}
export interface PointInches { x: number; y: number; }
export interface Outline {
  family: TrussFamily;
  spanIn: number;
  bearingLeft: PointInches;
  bearingRight: PointInches;
  topChord: PointInches[];
  bottomChord: PointInches[];
  status: "GEOMETRY_ONLY_NOT_ENGINEERED";
}
const finite = (n: number) => Number.isFinite(n);
export function generateRoofOutline(input: RoofInput): Outline {
  const { family, spanFt, pitchRisePer12 } = input;
  if (family === "scissor" || family === "attic" || family === "agricultural") {
    throw new Error(`${family} geometry is not yet implemented; refusing to return a misleading common-truss outline`);
  }
  const heel = input.heelHeightIn ?? 0;
  const overhang = input.overhangIn ?? 0;
  if (!["common", "scissor", "attic", "mono", "agricultural"].includes(family)) throw new Error("Unsupported truss family");
  if (!finite(spanFt) || spanFt < 8 || spanFt > 50) throw new Error("Span must be between 8 and 50 feet");
  if (!finite(pitchRisePer12) || pitchRisePer12 <= 0 || pitchRisePer12 > 18) throw new Error("Pitch must be greater than 0 and no more than 18:12");
  if (!finite(heel) || heel < 0 || heel > 48) throw new Error("Invalid heel height");
  if (!finite(overhang) || overhang < 0 || overhang > 48) throw new Error("Invalid overhang");
  const span = spanFt * 12;
  const slope = pitchRisePer12 / 12;
  const topChord: PointInches[] = family === "mono"
    ? [{x:-overhang,y:heel-overhang*slope},{x:span+overhang,y:heel+(span+overhang)*slope}]
    : [{x:-overhang,y:heel-overhang*slope},{x:span/2,y:heel+(span/2)*slope},{x:span+overhang,y:heel-overhang*slope}];
  return {
    family, spanIn: span,
    bearingLeft: {x:0,y:0}, bearingRight:{x:span,y:0},
    topChord, bottomChord:[{x:0,y:0},{x:span,y:0}],
    status:"GEOMETRY_ONLY_NOT_ENGINEERED"
  };
}
