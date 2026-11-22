import type { ElasticFrameMemberPointLoadInput } from "./elastic-frame-member-point-load.js";
import { elasticFrameShearElementLocalStiffness } from "./elastic-frame-shear-element.js";

export type ElasticFrameShearMemberPointLoadInput = ElasticFrameMemberPointLoadInput & {
  areaIn2: number;
  secondMomentIn4: number;
  elasticModulusPsi: number;
  shear: { shearModulusPsi: number; effectiveShearAreaIn2: number };
};

function exactFields(value: unknown, keys: readonly string[]) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
const cleanZero = (value: number) => value === 0 ? 0 : value;
const numericError = () => new Error("Shear member point load is outside the usable numerical range");
function product(...values: number[]) {
  if (!values.every(Number.isFinite)) throw numericError();
  if (values.includes(0)) return 0;
  const result = values.reduce((acc, value) => acc * value, 1);
  if (!Number.isFinite(result) || result === 0) throw numericError();
  return result;
}

/** Consistent applied RHS of a single strictly interior, concentric point force
 * on an unreleased planar prismatic Timoshenko member. No point couple,
 * eccentricity, release condensation, or member design is modeled. */
export function elasticFrameShearMemberPointLoad(input: ElasticFrameShearMemberPointLoadInput) {
  if (!exactFields(input, ["left", "right", "releaseLeftRotation", "releaseRightRotation", "stationIn", "fxLb", "fyLb",
      "areaIn2", "secondMomentIn4", "elasticModulusPsi", "shear"])) {
    throw new Error("Unknown or missing member point-load field");
  }
  const { left, right, releaseLeftRotation, releaseRightRotation, stationIn, fxLb, fyLb, areaIn2, secondMomentIn4, elasticModulusPsi, shear } = input;
  if (!exactFields(shear, ["shearModulusPsi", "effectiveShearAreaIn2"])) {
    throw new Error("Exact explicit shear modulus and effective area fields required");
  }
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
  const { shearFlexibility } = elasticFrameShearElementLocalStiffness({ lengthIn, areaIn2, secondMomentIn4,
    elasticModulusPsi, shearModulusPsi: shear.shearModulusPsi, effectiveShearAreaIn2: shear.effectiveShearAreaIn2 });
  const { bendingWeight: p, shearWeight: q } = shearFlexibility;
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

  // Exact homogeneous Timoshenko shape functions blend the Euler–Bernoulli
  // component with the complementary shear contribution. Form the shared
  // factors before multiplying by the force, preserving end exchange and
  // returning the conventional positive-CCW virtual moment.
  const aL = product(axial, u), aR = product(axial, t);
  const vL = product(transverse, u, q + p * u * (1 + 2 * t));
  const vR = product(transverse, t, q + p * t * (1 + 2 * u));
  const mL = product(transverse, stationIn, u, p * u + q / 2);
  const mR = product(-transverse, lengthIn - stationIn, t, p * t + q / 2);
  const localEquivalentLoad = [aL, vL, mL, aR, vR, mR] as const;
  const globalEquivalentLoad = [cleanZero(product(c, aL) - product(s, vL)), cleanZero(product(s, aL) + product(c, vL)), mL,
    cleanZero(product(c, aR) - product(s, vR)), cleanZero(product(s, aR) + product(c, vR)), mR] as const;

  // Physical resultant is not obtained by summing the equivalent DOFs.
  const rx = product(dx, t), ry = product(dy, t);
  const at = { xIn: left.xIn + rx, yIn: left.yIn + ry };
  const momentAboutLeftLbIn = cleanZero(product(rx, fyLb) - product(ry, fxLb));
  if (![...globalEquivalentLoad, at.xIn, at.yIn, momentAboutLeftLbIn].every(Number.isFinite)) throw numericError();
  return {
    stationIn, lengthIn, shearFlexibility,
    globalDofOrder: ["xLeft", "yLeft", "thetaLeft", "xRight", "yRight", "thetaRight"] as const,
    globalEquivalentLoad, localEquivalentLoad,
    physicalResultant: { fxLb, fyLb, at, momentAboutLeftLbIn },
    status: "PRELIMINARY_NOT_ENGINEERED" as const, manufacturingApproved: false as const,
  };
}
