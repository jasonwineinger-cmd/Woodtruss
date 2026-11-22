type Point = { xIn: number; yIn: number };
export interface ElasticFrameMemberPointLoadInput {
  left: Point;
  right: Point;
  releaseLeftRotation: false;
  releaseRightRotation: false;
  /** Strict interior distance in inches along the member from the authored left end. */
  stationIn: number;
  /** Signed global components applied on the planar member reference line. */
  fxLb: number;
  fyLb: number;
}

function exactFields(value: unknown, keys: readonly string[]) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
const cleanZero = (value: number) => value === 0 ? 0 : value;
const numericError = () => new Error("Member point load is outside the usable numerical range");
function product(...values: number[]) {
  if (!values.every(Number.isFinite)) throw numericError();
  if (values.includes(0)) return 0;
  const result = values.reduce((acc, value) => acc * value, 1);
  if (!Number.isFinite(result) || result === 0) throw numericError();
  return result;
}

/** Consistent applied RHS of a single strictly interior, concentric point force
 * on an unreleased planar prismatic Euler–Bernoulli member. No point couple,
 * eccentricity, release condensation, or member design is modeled. */
export function elasticFrameMemberPointLoad(input: ElasticFrameMemberPointLoadInput) {
  if (!exactFields(input, ["left", "right", "releaseLeftRotation", "releaseRightRotation", "stationIn", "fxLb", "fyLb"])) {
    throw new Error("Unknown or missing member point-load field");
  }
  const { left, right, releaseLeftRotation, releaseRightRotation, stationIn, fxLb, fyLb } = input;
  if (![left, right].every(point => exactFields(point, ["xIn", "yIn"]))) {
    throw new Error("Exact ordered member endpoint coordinates required");
  }
  if (releaseLeftRotation !== false || releaseRightRotation !== false) {
    throw new Error("Explicit unreleased end rotations are required for member point-load equivalence");
  }
  if (![left.xIn, left.yIn, right.xIn, right.yIn, stationIn, fxLb, fyLb].every(Number.isFinite)) {
    throw new Error("Finite endpoints, station and signed global point forces required");
  }
  const dx = right.xIn - left.xIn, dy = right.yIn - left.yIn;
  const lengthIn = Math.hypot(dx, dy);
  if (!Number.isFinite(lengthIn) || lengthIn <= 0) throw new Error("Finite nonzero member length required");
  if (stationIn <= 0 || stationIn >= lengthIn) throw new Error("Strict interior station from the authored left end required");
  const t = stationIn / lengthIn;
  const u = (lengthIn - stationIn) / lengthIn;
  if (!(t > 0 && t < 1 && u > 0 && u < 1)) throw numericError();

  const scale = Math.max(Math.abs(dx), Math.abs(dy));
  const nx = dx / scale, ny = dy / scale;
  const norm = Math.hypot(nx, ny);
  const c = nx / norm, s = ny / norm;
  if ((dx !== 0 && c === 0) || (dy !== 0 && s === 0)) throw numericError();
  const axial = cleanZero(product(c, fxLb) + product(s, fyLb));
  const transverse = cleanZero(product(-s, fxLb) + product(c, fyLb));

  // Linear axial interpolation and cubic Hermite bending interpolation at t.
  // The two slope coefficients retain units of inches; CCW rotation is positive.
  const aL = product(axial, u), aR = product(axial, t);
  const vL = product(transverse, u, u, 1 + 2 * t);
  const vR = product(transverse, t, t, 1 + 2 * u);
  const mL = product(transverse, stationIn, u, u);
  const mR = product(-transverse, lengthIn - stationIn, t, t);
  const localEquivalentLoad = [aL, vL, mL, aR, vR, mR] as const;
  const globalEquivalentLoad = [cleanZero(product(c, aL) - product(s, vL)), cleanZero(product(s, aL) + product(c, vL)), mL,
    cleanZero(product(c, aR) - product(s, vR)), cleanZero(product(s, aR) + product(c, vR)), mR] as const;

  // Physical resultant is not obtained by summing the equivalent DOFs.
  const rx = product(dx, t), ry = product(dy, t);
  const at = { xIn: left.xIn + rx, yIn: left.yIn + ry };
  const momentAboutLeftLbIn = cleanZero(product(rx, fyLb) - product(ry, fxLb));
  if (![...globalEquivalentLoad, at.xIn, at.yIn, momentAboutLeftLbIn].every(Number.isFinite)) throw numericError();
  return {
    stationIn, lengthIn,
    globalDofOrder: ["xLeft", "yLeft", "thetaLeft", "xRight", "yRight", "thetaRight"] as const,
    globalEquivalentLoad, localEquivalentLoad,
    physicalResultant: { fxLb, fyLb, at, momentAboutLeftLbIn },
    status: "PRELIMINARY_NOT_ENGINEERED" as const, manufacturingApproved: false as const,
  };
}
