import type { ElasticFrameElementProperties } from "./elastic-frame-element.js";
import { elasticFrameShearElementLocalStiffness, type ElasticFrameShearElementProperties } from "./elastic-frame-shear-element.js";

export type ElasticFrameShearEndActionInput = ElasticFrameElementProperties &
  Pick<ElasticFrameShearElementProperties, 'shearModulusPsi' | 'effectiveShearAreaIn2'> & {
  /** Uncondensed applied local RHS in axial, transverse, rotation order per end. */
  localEquivalentLoad: readonly number[];
  /** Use null only at a released section rotation; retained displacements are prescribed. */
  localDisplacements: readonly (number | null)[];
};
type LocalDofs = readonly [number, number, number, number, number, number];
const dofIndices = [0, 1, 2, 3, 4, 5] as const;
const dofOrder = ["uLeft", "vLeft", "thetaLeft", "uRight", "vRight", "thetaRight"] as const;
const fields = ["lengthIn", "areaIn2", "secondMomentIn4", "elasticModulusPsi",
  "releaseLeftRotation", "releaseRightRotation", "shearModulusPsi", "effectiveShearAreaIn2",
  "localEquivalentLoad", "localDisplacements"] as const;

const denseSix = (v: unknown): v is unknown[] => Array.isArray(v) && v.length === dofIndices.length &&
  Reflect.ownKeys(v).length === dofIndices.length + 1 && dofIndices.every(i => Object.hasOwn(v, i));
const outOfRange = () => new Error("Local shear end-action recovery exceeds the usable numeric range");
function multiply(a: number, b: number) {
  const value = a * b;
  if (!Number.isFinite(value) || (value === 0 && a !== 0 && b !== 0)) throw outOfRange();
  return value;
}
function divide(a: number, b: number) {
  const value = a / b;
  if (!Number.isFinite(value) || (value === 0 && a !== 0)) throw outOfRange();
  return value;
}
function subtract(a: number, b: number) {
  const value = a - b;
  if (!Number.isFinite(value)) throw outOfRange();
  return value === 0 ? 0 : value;
}
const tuple = (v: readonly number[]): LocalDofs => [v[0], v[1], v[2], v[3], v[4], v[5]];

/** Recover local node-on-member external actions, using full shear-flexible Kd - f.
 * The caller must supply the matching uncondensed shear-consistent load.
 * Released section rotations are solved internally at zero end moment, never
 * read from a joint rotation or assumed zero. No internal section envelopes,
 * connection behavior, capacity or manufacturing approval is inferred. */
export function recoverElasticFrameShearEndActions(input: ElasticFrameShearEndActionInput) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Reflect.ownKeys(input).length !== fields.length || fields.some(key => !Object.hasOwn(input, key))) {
    throw new Error("Unknown or missing elastic frame shear end-action field");
  }
  const { localEquivalentLoad: load, localDisplacements: displacement, releaseLeftRotation, releaseRightRotation, ...properties } = input;
  if (typeof releaseLeftRotation !== "boolean" || typeof releaseRightRotation !== "boolean") {
    throw new Error("Explicit end rotation releases required");
  }
  const releasedRotationIndices: number[] = [...(releaseLeftRotation ? [2] : []), ...(releaseRightRotation ? [5] : [])];
  if (!denseSix(load) || !load.every(Number.isFinite)) {
    throw new Error("A dense finite six-component uncondensed local load is required");
  }
  if (!denseSix(displacement) || !dofIndices.every(i => releasedRotationIndices.includes(i)
        ? displacement[i] === null : Number.isFinite(displacement[i]))) {
    throw new Error("Local displacements must be six finite-or-null DOFs, null only at an explicit released rotation");
  }
  const { matrix: k } = elasticFrameShearElementLocalStiffness(properties);
  const d = dofIndices.map(i => displacement[i] ?? 0);
  const retained = dofIndices.filter(i => !releasedRotationIndices.includes(i));
  const reducedRhs = (index: number) => retained.reduce((rhs, j) => subtract(rhs, multiply(k[index][j], d[j])), load[index]);
  const [a, b] = releasedRotationIndices;
  if (releasedRotationIndices.length === 1) d[a] = divide(reducedRhs(a), k[a][a]);
  if (releasedRotationIndices.length === 2) {
    const fa = reducedRhs(a), fb = reducedRhs(b);
    const multiplier = divide(k[b][a], k[a][a]);
    const pivot = subtract(k[b][b], multiply(multiplier, k[a][b]));
    if (!(pivot > 0) || pivot / Math.max(k[a][a], k[b][b]) <= 1e-12) {
      throw new Error("Released shear end rotation subblock is singular or ill-conditioned");
    }
    d[b] = divide(subtract(fb, multiply(multiplier, fa)), pivot);
    d[a] = divide(subtract(fa, multiply(k[a][b], d[b])), k[a][a]);
  }
  const releasedMomentResiduals: { dofIndex: number; momentLbIn: number }[] = [];
  const endActions = dofIndices.map(i => {
    const terms = dofIndices.map(j => multiply(k[i][j], d[j]));
    const action = terms.reduce((result, term) => subtract(result, -term), -load[i]);
    if (releasedRotationIndices.includes(i)) {
      const scale = Math.max(Math.abs(load[i]), ...terms.map(Math.abs));
      if (scale > 0 && Math.abs(action / scale) > 64 * Number.EPSILON) {
        throw new Error("Recovered released rotation does not have negligible relative moment residual");
      }
      releasedMomentResiduals.push({ dofIndex: i, momentLbIn: action });
    }
    return action;
  });
  return {
    localDofOrder: dofOrder, localDisplacements: tuple(d), localEndActions: tuple(endActions),
    releasedRotationIndices, releasedMomentResiduals,
    signConvention: "Node-on-member external actions in local axes; positive moments counterclockwise." as const,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, manufacturingApproved: false as const,
  };
}
