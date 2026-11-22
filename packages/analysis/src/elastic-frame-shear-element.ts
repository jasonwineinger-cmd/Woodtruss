export interface ElasticFrameShearElementProperties {
  lengthIn: number;
  areaIn2: number;
  secondMomentIn4: number;
  elasticModulusPsi: number;
  shearModulusPsi: number;
  effectiveShearAreaIn2: number;
}
const fields = ["lengthIn", "areaIn2", "secondMomentIn4", "elasticModulusPsi",
  "shearModulusPsi", "effectiveShearAreaIn2"] as const;
const positive = (value: number) => Number.isFinite(value) && value > 0;
const numericalError = () => new Error("Elastic frame shear stiffness exceeds the usable numeric range");

/** Stable product/divisor with alternate orderings when an intermediate exponent is unusable. */
function scaledProduct(a: number, b: number, d: number) {
  for (const result of [(a * b) / d, (a / d) * b, (b / d) * a]) {
    if (positive(result)) return result;
  }
  throw numericalError();
}

/** Linear prismatic planar Timoshenko element with unreleased end rotations.
 * G and effective shear area are explicit hypotheses, not inferred material
 * properties. No member loads, end-release condensation or design approval. */
export function elasticFrameShearElementLocalStiffness(properties: ElasticFrameShearElementProperties) {
  if (!properties || typeof properties !== "object" || Array.isArray(properties) ||
      Reflect.ownKeys(properties).length !== fields.length ||
      fields.some(key => !Object.hasOwn(properties, key) || !positive(properties[key]))) {
    throw new Error("Exactly six finite positive prismatic elastic frame properties are required");
  }
  const { lengthIn: L, areaIn2: A, secondMomentIn4: I, elasticModulusPsi: E,
    shearModulusPsi: G, effectiveShearAreaIn2: As } = properties;
  const axial = scaledProduct(E, A, L);
  const rotation = scaledProduct(E, I, L);
  const pureBendingTransverse = scaledProduct(12, rotation / L, L);
  const pureShearTransverse = scaledProduct(G, As, L);

  // Dimensionless phi is pureBendingTransverse / pureShearTransverse. Use the small /
  // large ratio (never overflowing) so GAs -> 0 or very large does not create
  // Infinity/Infinity, catastrophic cancellation or a spurious zero spring.
  const shearDominant = pureShearTransverse >= pureBendingTransverse;
  const smaller = Math.min(pureShearTransverse, pureBendingTransverse);
  const larger = Math.max(pureShearTransverse, pureBendingTransverse);
  const ratio = smaller / larger;
  const bendingWeight = shearDominant ? 1 / (1 + ratio) : ratio / (1 + ratio);
  const shearWeight = shearDominant ? ratio / (1 + ratio) : 1 / (1 + ratio);
  const transverse = smaller / (1 + ratio);
  const coupling = scaledProduct(transverse, L, 2);
  const endRotation = rotation * (1 + 3 * bendingWeight);
  const oppositeFactor = shearDominant ? (2 - ratio) / (1 + ratio) : (2 * ratio - 1) / (1 + ratio);
  const oppositeRotation = rotation * oppositeFactor;
  if (![transverse, coupling, endRotation].every(positive) || !Number.isFinite(oppositeRotation) ||
      (oppositeRotation === 0 && oppositeFactor !== 0)) throw numericalError();
  const opposite = oppositeRotation === 0 ? 0 : oppositeRotation;
  const phi = pureBendingTransverse / pureShearTransverse;
  return {
    localDofOrder: ["uLeft", "vLeft", "thetaLeft", "uRight", "vRight", "thetaRight"] as const,
    matrix: [
      [axial, 0, 0, -axial, 0, 0],
      [0, transverse, coupling, 0, -transverse, coupling],
      [0, coupling, endRotation, 0, -coupling, opposite],
      [-axial, 0, 0, axial, 0, 0],
      [0, -transverse, -coupling, 0, transverse, -coupling],
      [0, coupling, opposite, 0, -coupling, endRotation],
    ],
    shearFlexibility: {
      phi: positive(phi) ? phi : null,
      bendingWeight, shearWeight,
      pureBendingTransverseLbPerIn: pureBendingTransverse, pureShearTransverseLbPerIn: pureShearTransverse,
    },
    shearDeformationModeled: true as const,
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    manufacturingApproved: false as const,
  };
}
