import type { ElasticFrameElementProperties } from "./elastic-frame-element.js";
import type { ElasticFrameLocalLoad } from "./elastic-frame-release-load.js";
import { elasticFrameShearElementLocalStiffness } from "./elastic-frame-shear-element.js";

export type ElasticFrameShearReleaseProperties = ElasticFrameElementProperties & {
  shearModulusPsi: number;
  effectiveShearAreaIn2: number;
};
export type ElasticFrameShearReleaseLoadInput = ElasticFrameShearReleaseProperties & {
  localEquivalentLoad: readonly number[];
};
const fields = ["lengthIn", "areaIn2", "secondMomentIn4", "elasticModulusPsi",
  "shearModulusPsi", "effectiveShearAreaIn2", "releaseLeftRotation", "releaseRightRotation"] as const;
const dofs = [0, 1, 2, 3, 4, 5] as const;
const numericError = () => new Error("Elastic frame shear release elimination exceeds the usable numeric range");
const zero = (x: number) => x === 0 ? 0 : x;

function exactFields(input: unknown, keys: readonly string[]) {
  return !!input && typeof input === "object" && !Array.isArray(input) &&
    Reflect.ownKeys(input).length === keys.length && keys.every(key => Object.hasOwn(input, key));
}

function subtractProduct(value: number, factor: number, multiplier: number) {
  const correction = factor * multiplier;
  const next = value - correction;
  if (!Number.isFinite(correction) || !Number.isFinite(next) ||
      (correction === 0 && factor !== 0 && multiplier !== 0)) throw numericError();
  return zero(next);
}

function eliminate(properties: ElasticFrameShearReleaseProperties, rhs?: number[]) {
  const { releaseLeftRotation, releaseRightRotation, ...full } = properties;
  if (typeof releaseLeftRotation !== "boolean" || typeof releaseRightRotation !== "boolean") {
    throw new Error("Explicit end rotation releases required");
  }
  const element = elasticFrameShearElementLocalStiffness(full);
  const matrix = element.matrix;
  const releasedRotationIndices = [...(releaseLeftRotation ? [2] : []), ...(releaseRightRotation ? [5] : [])];
  const rotationalScale=Math.max(matrix[2][2],matrix[5][5]);
  for (const released of releasedRotationIndices) {
    const pivot = matrix[released][released];
    if (!Number.isFinite(pivot) || pivot <= 0 || pivot/rotationalScale<=1e-12) throw numericError();
    for (const i of dofs) {
      if (i === released) continue;
      const entry = matrix[i][released];
      const multiplier = entry / pivot;
      if (!Number.isFinite(multiplier) || (multiplier === 0 && entry !== 0)) throw numericError();
      if (rhs) rhs[i] = subtractProduct(rhs[i], multiplier, rhs[released]);
      for (let j = i; j < dofs.length; j++) {
        if (j === released) continue;
        matrix[i][j] = matrix[j][i] = subtractProduct(matrix[i][j], multiplier, matrix[released][j]);
      }
    }
    for (const i of dofs) matrix[i][released] = matrix[released][i] = 0;
    if (rhs) rhs[released] = 0;
  }
  // Under zero section end moments, the only homogeneous stiffness is axial.
  // This exact known null block is applied only after successful elimination.
  if (releasedRotationIndices.length === 2)
    for (const i of [1, 2, 4, 5]) for (const j of [1, 2, 4, 5]) matrix[i][j] = 0;
  return { ...element, matrix, releasedRotationIndices };
}

/** Condense the full linear Timoshenko stiffness at zero released moments.
 * Retain exact zero rows as placeholders in the common local six-DOF order. */
export function elasticFrameShearReleasedLocalStiffness(input: ElasticFrameShearReleaseProperties) {
  if (!exactFields(input, fields)) throw new Error("Unknown or missing elastic frame shear release field");
  return eliminate(input);
}

/** Condense the uncondensed applied local RHS with the same stiffness pivots.
 * This does not infer any missing applied or concentrated moment. */
export function condenseElasticFrameShearLoad(input: ElasticFrameShearReleaseLoadInput): ElasticFrameLocalLoad {
  if (!exactFields(input, [...fields, "localEquivalentLoad"])) {
    throw new Error("Unknown or missing elastic frame shear release-load field");
  }
  const { localEquivalentLoad, ...properties } = input;
  if (!Array.isArray(localEquivalentLoad) || localEquivalentLoad.length !== dofs.length ||
      Reflect.ownKeys(localEquivalentLoad).length !== dofs.length + 1 ||
      dofs.some(i => !Object.hasOwn(localEquivalentLoad, i) || !Number.isFinite(localEquivalentLoad[i]))) {
    throw new Error("A dense finite six-component uncondensed local load is required");
  }
  const rhs = dofs.map(i => zero(localEquivalentLoad[i]));
  eliminate(properties, rhs);
  return [rhs[0], rhs[1], rhs[2], rhs[3], rhs[4], rhs[5]];
}
