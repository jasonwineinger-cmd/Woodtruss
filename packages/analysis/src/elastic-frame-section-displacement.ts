import { recoverElasticFrameSectionDemand, type ElasticFrameSectionDemandInput } from "./elastic-frame-section-demand.js";

export type ElasticFrameSectionDisplacementInput = ElasticFrameSectionDemandInput & {
  /** Actual member end DOFs [uL,vL,thetaL,uR,vR,thetaR], including recovered released rotations. */
  localDisplacements: readonly number[];
  elasticModulusPsi: number;
  areaIn2: number;
  secondMomentIn4: number;
  shear: { shearModulusPsi: number; effectiveShearAreaIn2: number } | null;
  stationsIn: readonly number[];
};
export type ElasticFrameSectionDisplacement = {
  stationIn: number;
  axialIn: number;
  transverseIn: number;
  rotationRad: number;
};
const indices = [0, 1, 2, 3, 4, 5] as const;
const fields = ["lengthIn", "localEndActions", "localDisplacements", "elasticModulusPsi",
  "areaIn2", "secondMomentIn4", "shear", "uniform", "point", "stationsIn"] as const;
const MAX_STATIONS = 1_000;
const END_RELATIVE_TOLERANCE = 1e-8;
const positive = (v: number) => Number.isFinite(v) && v > 0;
const outOfRange = () => new Error("Section displacement exceeds the usable numeric range");
const zero = (v: number) => v === 0 ? 0 : v;
function exactFields(v: unknown, keys: readonly string[]) {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    Reflect.ownKeys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
}
function product(...values: number[]) {
  if (!values.every(Number.isFinite)) throw outOfRange();
  if (values.includes(0)) return 0;
  const result = values.reduce((a, b) => a * b, 1);
  if (!Number.isFinite(result) || result === 0) throw outOfRange();
  return result;
}
function sum(values: readonly number[]) {
  const value = values.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(value)) throw outOfRange();
  return zero(value);
}
function dividedPower(value: number, x: number, power: number, divisor: number, rigidity: number) {
  if (value === 0 || x === 0) return 0;
  // Keep ordinary work exact where possible, with bounded alternate orders for
  // avoiding an overflowing intermediate polynomial term or reciprocal.
  const factors = Array<number>(power).fill(x);
  const a = (value: number, factors: number[]) => factors.reduce((acc, f) => acc * f, value);
  const options = [
    a(value, factors) / divisor / rigidity,
    a(value / rigidity / divisor, factors),
    a(value / divisor, factors) / rigidity,
  ];
  const term = options.find(result => Number.isFinite(result) && result !== 0);
  if (term === undefined) throw outOfRange();
  return term;
}
function matches(value: number, prescribed: number, terms: readonly number[]) {
  const scale = Math.max(Math.abs(value), Math.abs(prescribed), ...terms.map(Math.abs));
  return scale === 0 || Math.abs(value / scale - prescribed / scale) <= END_RELATIVE_TOLERANCE;
}

/** Sample local displacement by integrating physical section forces over one
 * prismatic elastic member. u'=N/EA, theta'=M/EI and, when explicit shear is
 * used, v'=theta+V/GA. With shear:null, v'=theta. Only supplied stations are
 * sampled; no deflection extrema, capacity or approval are inferred. */
export function recoverElasticFrameSectionDisplacement(input: ElasticFrameSectionDisplacementInput) {
  if (!exactFields(input, fields)) throw new Error("Unknown or missing frame section-displacement field");
  const { lengthIn: L, localEndActions, localDisplacements, elasticModulusPsi: E,
    areaIn2: A, secondMomentIn4: I, shear, uniform, point, stationsIn } = input;
  if (![L, E, A, I].every(positive) || !Array.isArray(localDisplacements) || localDisplacements.length !== 6 ||
      Reflect.ownKeys(localDisplacements).length !== 7 ||
      indices.some(i => !Object.hasOwn(localDisplacements, i) || !Number.isFinite(localDisplacements[i]))) {
    throw new Error("Positive prismatic properties and six finite actual local end displacements required");
  }
  if (shear !== null && (!exactFields(shear, ["shearModulusPsi", "effectiveShearAreaIn2"]) ||
      ![shear.shearModulusPsi, shear.effectiveShearAreaIn2].every(positive))) {
    throw new Error("Explicit positive shear modulus and effective area, or null, are required");
  }
  if (!Array.isArray(stationsIn) || stationsIn.length < 1 || stationsIn.length > MAX_STATIONS ||
      Reflect.ownKeys(stationsIn).length !== stationsIn.length + 1) {
    throw new Error("One to 1000 explicit unique stations within the member are required");
  }
  const ordered = Array.from(stationsIn);
  if (ordered.some(x => !Number.isFinite(x) || x < 0 || x > L) || new Set(ordered).size !== ordered.length) {
    throw new Error("One to 1000 explicit unique stations within the member are required");
  }
  // Check the supplied loads against both ends first, not just displacement closure.
  recoverElasticFrameSectionDemand({ lengthIn: L, localEndActions, uniform, point });
  const EA = product(E, A), EI = product(E, I);
  const GA = shear ? product(shear.shearModulusPsi, shear.effectiveShearAreaIn2) : null;
  const [NL, VL, ML] = localEndActions;
  const [uL, vL, thetaL, uR, vR, thetaR] = localDisplacements;
  const qx = uniform?.qxLbPerIn ?? 0, qy = uniform?.qyLbPerIn ?? 0;
  const Fx = point?.fxLb ?? 0, Fy = point?.fyLb ?? 0;
  function terms(x: number) {
    const d = point ? Math.max(0, x - point.stationIn) : 0;
    return {
      axial: [uL, dividedPower(-NL, x, 1, 1, EA), dividedPower(-qx, x, 2, 2, EA), dividedPower(-Fx, d, 1, 1, EA)],
      rotation: [thetaL, dividedPower(-ML, x, 1, 1, EI), dividedPower(VL, x, 2, 2, EI),
        dividedPower(qy, x, 3, 6, EI), dividedPower(Fy, d, 2, 2, EI)],
      transverse: [vL, product(thetaL, x), dividedPower(-ML, x, 2, 2, EI), dividedPower(VL, x, 3, 6, EI),
        dividedPower(qy, x, 4, 24, EI), dividedPower(Fy, d, 3, 6, EI),
        ...(GA === null ? [] : [dividedPower(-VL, x, 1, 1, GA), dividedPower(-qy, x, 2, 2, GA), dividedPower(-Fy, d, 1, 1, GA)])],
    };
  }
  function sample(stationIn: number, values = terms(stationIn)): ElasticFrameSectionDisplacement {
    return { stationIn: zero(stationIn), axialIn: sum(values.axial),
      transverseIn: sum(values.transverse), rotationRad: sum(values.rotation) };
  }
  const rightTerms = terms(L);
  const computedRight = sample(L, rightTerms);
  if (!matches(computedRight.axialIn, uR, rightTerms.axial) ||
      !matches(computedRight.transverseIn, vR, rightTerms.transverse) ||
      !matches(computedRight.rotationRad, thetaR, rightTerms.rotation)) {
    throw new Error("Integrated displacement does not close against all three actual right end DOFs");
  }
  return {
    samples: ordered.map(station => sample(station)),
    rightEndClosureRelativeTolerance: END_RELATIVE_TOLERANCE,
    shearDeformationModeled: shear !== null,
    samplesOnly: true as const,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, manufacturingApproved: false as const,
  };
}
