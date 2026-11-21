import {
  generateEqualPitchHipRoofReference,
  type EqualPitchHipReferenceInput,
  type HipReferencePoint,
} from "./hip-roof-reference.js";

export interface EqualPitchHipSectionInput extends EqualPitchHipReferenceInput {
  /** Inches from the short eave at the long-axis origin. */
  stationIn: number;
}

/**
 * Intersect the ideal equal-pitch roof surface with a transverse vertical plane.
 * The section before or beyond the ridge is a trapezoid (its horizontal top
 * belongs to the end roof plane); through the ridge it is triangular.
 * These are envelope vertices, not members, bearing positions or cuts.
 */
export function generateEqualPitchHipTransverseSection(input: EqualPitchHipSectionInput) {
  const roof = generateEqualPitchHipRoofReference(input);
  const { length,width } = roof.footprintIn;
  const x = input.stationIn;
  if (!Number.isFinite(x) || !(0 < x && x < length))
    throw new Error("Hip section station must be strictly inside the long-axis eave bounds");
  const run = Math.min(x,length-x,width/2);
  const z = run * (roof.pitchRisePer12 / 12);
  if (!(run > 0 && z > 0 && width-run > 0))
    throw new Error("Hip section is numerically degenerate");

  const throughRidge = x >= roof.ridge.start.x && x <= roof.ridge.end.x;
  const surface: HipReferencePoint[] = [{x,y:0,z:0},{x,y:run,z}];
  if (!throughRidge) {
    const far = width-run;
    if (far <= run) throw new Error("Hip end roof section is numerically degenerate");
    surface.push({x,y:far,z});
  }
  surface.push({x,y:width,z:0});
  return {
    kind: "equal-pitch-hip-transverse-envelope" as const,
    units: roof.units,
    status: roof.status,
    fabricationAuthorized: false as const,
    stationIn: x,
    sectionRegion: throughRidge ? "ridge" as const
      : x < roof.ridge.start.x ? "near-end-plane" as const : "far-end-plane" as const,
    surface,
    warnings: ["Roof envelope sections are geometry only, not truss members, structural boundaries, or fabrication data."],
  };
}
