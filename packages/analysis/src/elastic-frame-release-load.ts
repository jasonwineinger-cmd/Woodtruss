import { elasticFrameElementLocalStiffness, type ElasticFrameElementProperties } from "./elastic-frame-element.js";

export type ElasticFrameLocalLoad = readonly [number, number, number, number, number, number];
export type ElasticFrameMemberLoadReleaseInput = ElasticFrameElementProperties & { localEquivalentLoad: readonly number[] };

const fields = ["lengthIn", "areaIn2", "secondMomentIn4", "elasticModulusPsi",
  "releaseLeftRotation", "releaseRightRotation", "localEquivalentLoad"] as const;
const indices = [0, 1, 2, 3, 4, 5] as const;

/** Condense an applied, unreleased local element RHS consistently with the
 * stiffness Schur elimination. No boundary/support or fixed-end action
 * sign conversion is implied. Released moment slots become exact zero. */
export function condenseElasticFrameMemberLoad(input: ElasticFrameMemberLoadReleaseInput): ElasticFrameLocalLoad {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Reflect.ownKeys(input).length !== fields.length || fields.some(key => !Object.hasOwn(input, key))) {
    throw new Error("Unknown or missing elastic frame release-load field");
  }
  const { releaseLeftRotation, releaseRightRotation, localEquivalentLoad, ...properties } = input;
  if (typeof releaseLeftRotation !== "boolean" || typeof releaseRightRotation !== "boolean") {
    throw new Error("Explicit end rotation releases required");
  }
  if (!Array.isArray(localEquivalentLoad) || localEquivalentLoad.length !== indices.length ||
      Reflect.ownKeys(localEquivalentLoad).length !== indices.length + 1 ||
      indices.some(index => !Object.hasOwn(localEquivalentLoad, index) || !Number.isFinite(localEquivalentLoad[index]))) {
    throw new Error("A dense finite six-component uncondensed local load is required");
  }
  const f = indices.map(index => localEquivalentLoad[index] === 0 ? 0 : localEquivalentLoad[index]);
  const { matrix: k } = elasticFrameElementLocalStiffness({
    ...properties, releaseLeftRotation: false, releaseRightRotation: false,
  });
  const releases = [...(releaseLeftRotation ? [2] : []), ...(releaseRightRotation ? [5] : [])];
  for (const released of releases) {
    const pivot = k[released][released];
    if (!Number.isFinite(pivot) || pivot <= 0) throw new Error("Invalid released load stiffness pivot");
    for (const i of indices) {
      if (i === released) continue;
      const multiplier = k[i][released] / pivot;
      const correction = multiplier * f[released];
      const next = f[i] - correction;
      if (![multiplier, correction, next].every(Number.isFinite) ||
          (multiplier === 0 && k[i][released] !== 0) ||
          (correction === 0 && multiplier !== 0 && f[released] !== 0)) {
        throw new Error("Static release-load condensation exceeds the usable numeric range");
      }
      f[i] = next === 0 ? 0 : next;
      for (let j = i; j < indices.length; j++) {
        if (j === released) continue;
        const updated = k[i][j] - multiplier * k[released][j];
        if (!Number.isFinite(updated)) throw new Error("Nonfinite release stiffness condensation");
        k[i][j] = k[j][i] = updated === 0 ? 0 : updated;
      }
    }
    for (const index of indices) k[index][released] = k[released][index] = 0;
    f[released] = 0;
  }
  return [f[0], f[1], f[2], f[3], f[4], f[5]];
}
