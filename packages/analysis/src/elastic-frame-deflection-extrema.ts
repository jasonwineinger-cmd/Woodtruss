import { isolateElasticFrameBranchRoots } from "./elastic-frame-branch-roots.js";
import { elasticFrameDeflectionBranches } from "./elastic-frame-deflection-branches.js";
import { recoverElasticFrameSectionDisplacement,
  type ElasticFrameSectionDisplacementInput } from "./elastic-frame-section-displacement.js";

type ExtremaInput = Omit<ElasticFrameSectionDisplacementInput, "stationsIn">;
type Position = {stationIn:number;valueIn:number};
const fields = ["lengthIn", "localEndActions", "localDisplacements", "elasticModulusPsi",
  "areaIn2", "secondMomentIn4", "shear", "uniform", "point"] as const;

function selectExtrema(positions: readonly Position[]) {
  let min = positions[0], max = positions[0];
  for (const current of positions) {
    if (current.valueIn < min.valueIn) min = current;
    if (current.valueIn > max.valueIn) max = current;
  }
  return { min, max };
}

/** Extrema of modeled local transverse displacement and of the same field
 * relative to the straight line through the displaced endpoints. The reference
 * is drawn over the original ordered local x coordinate (small-displacement
 * theory), not a rotated as-built chord, a joint limit, or a code check. */
export function recoverElasticFrameDeflectionExtrema(input: ExtremaInput) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Reflect.ownKeys(input).length !== fields.length || !fields.every(key => Object.hasOwn(input, key)))
    throw new Error("Unknown or missing frame deflection-extrema field");
  const L = input.lengthIn;
  // This audits the physical loads and actual released/rigid far-end DOFs
  // before deriving candidate stations. It does not snap the recovered curve.
  recoverElasticFrameSectionDisplacement({ ...input, stationsIn: [0, L] });
  const v0 = input.localDisplacements[1], v1 = input.localDisplacements[4];
  const chordDelta = v1 - v0, chordSlope = chordDelta / L;
  if (![chordDelta, chordSlope].every(Number.isFinite) || (chordDelta !== 0 && chordSlope === 0))
    throw new Error("Displaced-end chord is outside the usable numerical range");
  const branches = elasticFrameDeflectionBranches(input);
  const absolute = new Set<number>(), relative = new Set<number>();
  for (const branch of branches) {
    const {startStationIn: a, endStationIn: b, slopeCoefficients: slope} = branch;
    for (const candidates of [absolute, relative]) {
      // Endpoints and the exact point-load station must always be candidates:
      // explicit shear can cause a slope jump and an extremum without a root.
      const coefficients = candidates === absolute ? slope : [slope[0] - chordSlope, ...slope.slice(1)];
      const { roots } = isolateElasticFrameBranchRoots(coefficients);
      candidates.add(a);
      candidates.add(b);
      let previous = a;
      for (const r of roots) {
        const station = a + r * (b - a);
        if (!(station > previous && station < b))
          throw new Error("Distinct frame deflection stations are outside the usable numerical resolution");
        candidates.add(station);
        previous = station;
      }
      // For a flat derivative interval its two endpoints are sufficient
      // candidates. There is no unique interior station of the plateau.
    }
  }
  const set = [...new Set([...absolute, ...relative])].sort((a,b)=>a-b);
  const recovered = recoverElasticFrameSectionDisplacement({ ...input, stationsIn: set });
  const values = new Map(recovered.samples.map(row => [row.stationIn,row.transverseIn]));
  function points(candidates: Set<number>, removeChord:boolean) {
    return [...candidates].sort((a,b)=>a-b).map(stationIn=>{
      // End values are independently recovered actual DOFs, already closed
      // above. The chord passes through these values by definition.
      const v = stationIn === 0 ? v0 : stationIn === L ? v1 : values.get(stationIn)!;
      const valueIn = !removeChord ? v : stationIn === 0 || stationIn === L
        ? 0 : (v - v0) - chordDelta * (stationIn / L);
      if(!Number.isFinite(valueIn)) throw new Error("Nonfinite frame deflection at a candidate station");
      return { stationIn, valueIn: valueIn === 0 ? 0 : valueIn };
    });
  }
  return {
    transverseIn: selectExtrema(points(absolute,false)),
    chordRelativeTransverseIn: selectExtrema(points(relative,true)),
    chordReference: "STRAIGHT_LINE_THROUGH_DISPLACED_ENDS_ON_ORIGINAL_LOCAL_AXIS" as const,
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    serviceabilityApproved: false as const, fabricationAuthorized: false as const,
  };
}
