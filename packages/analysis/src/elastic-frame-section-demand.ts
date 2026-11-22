export interface ElasticFrameSectionDemandInput {
  lengthIn: number;
  /** Local node-on-member actions [Nleft,Vleft,Mleft,Nright,Vright,Mright]. */
  localEndActions: readonly number[];
  /** Local uniform intensities per actual member inch over the full member. */
  uniform: { qxLbPerIn: number; qyLbPerIn: number } | null;
  /** Optional single concentric local force at a strictly interior station. */
  point: { stationIn: number; fxLb: number; fyLb: number } | null;
}
type SectionLimit = "left" | "right" | "continuous";
export type ElasticFrameSectionDemand = {
  stationIn: number;
  side: SectionLimit;
  axialLb: number;
  shearLb: number;
  momentLbIn: number;
};
const indices = [0, 1, 2, 3, 4, 5] as const;
const clean = (value: number) => value === 0 ? 0 : value;
const badNumeric = () => new Error("Frame section demand exceeds the usable numeric range");
function exactFields(value: unknown, keys: readonly string[]) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function sum(...terms: number[]) {
  const result = terms.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(result)) throw badNumeric();
  return clean(result);
}
function product(a: number, b: number) {
  const value = a * b;
  if (!Number.isFinite(value) || (value === 0 && a !== 0 && b !== 0)) throw badNumeric();
  return clean(value);
}
const END_RELATIVE_TOLERANCE = 1e-9;
function matchesRight(value: number, expected: number, terms: readonly number[]) {
  // Unloaded/released components can contain roundoff from assembling and
  // unrotating the full element. Use an absolute floor of 1e-9 in the
  // component’s native units (lb or lb-in), not the scale of roundoff itself.
  const scale = Math.max(1,Math.abs(value),Math.abs(expected),...terms.map(Math.abs));
  return Math.abs(value / scale - expected / scale) <= END_RELATIVE_TOLERANCE;
}

/** Local actions on the left segment's right cut, excluding any out-of-plane
 * behavior. End sections are limits from inside the member; both limits of an
 * interior point force are kept. Positive bending follows the stated equation,
 * dM/dx = -V between point forces. No capacity or design approval is assessed. */
export function recoverElasticFrameSectionDemand(input: ElasticFrameSectionDemandInput) {
  if (!exactFields(input, ["lengthIn", "localEndActions", "uniform", "point"])) {
    throw new Error("Unknown or missing frame section-demand field");
  }
  const { lengthIn: L, localEndActions, uniform, point } = input;
  if (!Number.isFinite(L) || L <= 0 || !Array.isArray(localEndActions) || localEndActions.length !== 6 ||
      Reflect.ownKeys(localEndActions).length !== 7 ||
      indices.some(index => !Object.hasOwn(localEndActions, index) || !Number.isFinite(localEndActions[index]))) {
    throw new Error("Finite positive length and six finite ordered local end actions required");
  }
  if (uniform !== null && (!exactFields(uniform, ["qxLbPerIn", "qyLbPerIn"]) ||
      ![uniform.qxLbPerIn, uniform.qyLbPerIn].every(Number.isFinite))) {
    throw new Error("Uniform member loads require exact finite local intensities or null");
  }
  if (point !== null && (!exactFields(point, ["stationIn", "fxLb", "fyLb"]) ||
      ![point.stationIn, point.fxLb, point.fyLb].every(Number.isFinite) || point.stationIn <= 0 || point.stationIn >= L)) {
    throw new Error("Point member load requires one strictly interior station and finite local components, or null");
  }
  const [NL, VL, ML, NR, VR, MR] = localEndActions;
  const qx = uniform?.qxLbPerIn ?? 0, qy = uniform?.qyLbPerIn ?? 0;
  function terms(x: number, includesPoint: boolean) {
    const dx = point && includesPoint ? x - point.stationIn : 0;
    const n = [NL, product(qx, x), point && includesPoint ? point.fxLb : 0];
    const v = [VL, product(qy, x), point && includesPoint ? point.fyLb : 0];
    const half=x/2;
    if(x!==0&&half===0&&v[1]!==0)throw badNumeric();
    const m = [-ML, product(x, VL), product(v[1], half), product(dx, point?.fyLb ?? 0)];
    return { n, v, m };
  }
  function at(stationIn: number, side: SectionLimit = "continuous"): ElasticFrameSectionDemand {
    const includesPoint = point !== null && (stationIn > point.stationIn || side === "right");
    const { n, v, m } = terms(stationIn, includesPoint);
    return { stationIn, side, axialLb: clean(-sum(...n)), shearLb: clean(-sum(...v)), momentLbIn: sum(...m) };
  }
  const right = at(L);
  const end = terms(L, point !== null);
  if (!matchesRight(right.axialLb, NR, end.n) || !matchesRight(right.shearLb, VR, end.v) ||
      !matchesRight(right.momentLbIn, MR, end.m)) {
    throw new Error("Recovered section demand does not close against the local right end actions");
  }

  const sections = [at(0)];
  function addInteriorRoot(from: number, to: number, afterPoint: boolean) {
    if (qy === 0) return;
    const v1 = sum(...terms(from, afterPoint).v), v2 = sum(...terms(to, afterPoint).v);
    if (!((v1 < 0 && v2 > 0) || (v1 > 0 && v2 < 0))) return;
    const root = -sum(VL, afterPoint ? point!.fyLb : 0) / qy;
    if (!Number.isFinite(root) || root <= from || root >= to) throw badNumeric();
    sections.push(at(root));
  }
  if (point) {
    addInteriorRoot(0, point.stationIn, false);
    sections.push(at(point.stationIn, "left"), at(point.stationIn, "right"));
    addInteriorRoot(point.stationIn, L, true);
  } else {
    addInteriorRoot(0, L, false);
  }
  sections.push(right);
  const extremaFor = (key: "axialLb" | "shearLb" | "momentLbIn") => {
    let min = sections[0], max = sections[0];
    for (const section of sections) {
      if (section[key] < min[key]) min = section;
      if (section[key] > max[key]) max = section;
    }
    return { min, max };
  };
  return { sections, extrema: { axialLb: extremaFor("axialLb"), shearLb: extremaFor("shearLb"),
      momentLbIn: extremaFor("momentLbIn") },
    signConvention: "Local actions on the left segment’s right cut. N and V negate the net left-segment forces; M = -ML + x VL plus transverse load moments." as const,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, manufacturingApproved: false as const };
}
