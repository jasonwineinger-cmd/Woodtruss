export interface RectangularPlanarElasticPropertyInput {
  sectionId: string;
  dimensionBasisId: string;
  actualWidthIn: number;
  actualDepthIn: number;
  /** Local section x = width and y = depth. This is shear direction, not moment axis. */
  transverseDirection: "along-width" | "along-depth";
  modulusHypothesis: {
    basisId: string;
    longitudinalModulusPsi: number;
    shearModulusPsi: number;
  };
  shearAreaHypothesis: {
    basisId: string;
    /** Must identify the same local direction for which the area was authored. */
    transverseDirection: "along-width" | "along-depth";
    effectiveShearAreaIn2: number;
  };
}

const identity = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input.trim() === input;
const positive = (input: number) => Number.isFinite(input) && input > 0;

/** An explicitly oriented, prismatic rectangular section property screen.
 * The effective shear area remains a caller-supplied comparison hypothesis,
 * not a correction derived from a code, material model or catalog. */
export function studyRectangularPlanarElasticProperties(input: RectangularPlanarElasticPropertyInput) {
  const { sectionId, dimensionBasisId, actualWidthIn, actualDepthIn, transverseDirection,
    modulusHypothesis, shearAreaHypothesis } = input;
  if (!identity(sectionId) || !identity(dimensionBasisId) ||
      ![actualWidthIn, actualDepthIn].every(positive) ||
      (transverseDirection !== "along-width" && transverseDirection !== "along-depth")) {
    throw new Error("Explicit rectangle dimensions, trace identities and local transverse direction are required");
  }
  if (!modulusHypothesis || !identity(modulusHypothesis.basisId) ||
      ![modulusHypothesis.longitudinalModulusPsi, modulusHypothesis.shearModulusPsi].every(positive)) {
    throw new Error("Explicit modulus values and hypothesis identity are required");
  }
  if (!shearAreaHypothesis || !identity(shearAreaHypothesis.basisId) ||
      shearAreaHypothesis.transverseDirection !== transverseDirection ||
      !positive(shearAreaHypothesis.effectiveShearAreaIn2)) {
    throw new Error("An explicit positive shear-area hypothesis for the exact transverse direction is required");
  }

  const grossAreaIn2 = actualWidthIn * actualDepthIn;
  const { effectiveShearAreaIn2 } = shearAreaHypothesis;
  if (effectiveShearAreaIn2 > grossAreaIn2) {
    throw new Error("This sensitivity study only accepts effective shear area at or below gross section area");
  }
  const alongWidth = transverseDirection === "along-width";
  const bendingAbout = alongWidth ? "depth" as const : "width" as const;
  const transverseDepthIn = alongWidth ? actualWidthIn : actualDepthIn;
  const inertiaIn4 = grossAreaIn2 * (transverseDepthIn / 12) * transverseDepthIn;
  const { longitudinalModulusPsi, shearModulusPsi } = modulusHypothesis;
  const axialRigidityLb = longitudinalModulusPsi * grossAreaIn2;
  const flexuralRigidityLbIn2 = longitudinalModulusPsi * inertiaIn4;
  const effectiveShearRigidityLb = shearModulusPsi * effectiveShearAreaIn2;
  const grossAreaShearReferenceLb = shearModulusPsi * grossAreaIn2;
  const effectiveToGrossAreaRatio = effectiveShearAreaIn2 / grossAreaIn2;
  if (![grossAreaIn2, inertiaIn4, axialRigidityLb, flexuralRigidityLbIn2, effectiveShearRigidityLb,
    grossAreaShearReferenceLb, effectiveToGrossAreaRatio].every(positive)) {
    throw new Error("The resulting ratios or section properties exceed the usable numeric range");
  }
  return {
    status: "PRELIMINARY_ELASTIC_HYPOTHESIS_ONLY" as const,
    sectionId, dimensionBasisId, actualWidthIn, actualDepthIn, transverseDirection, bendingAbout,
    modulusBasisId: modulusHypothesis.basisId, shearAreaBasisId: shearAreaHypothesis.basisId,
    longitudinalModulusPsi, shearModulusPsi, grossAreaIn2, effectiveShearAreaIn2,
    effectiveToGrossAreaRatio, inertiaIn4, axialRigidityLb, flexuralRigidityLbIn2,
    effectiveShearRigidityLb, grossAreaShearReferenceLb,
    suppliedInputsIndependentlyVerified: false as const,
    approvedForStructuralUse: false as const,
    limitations: [
      "A gross-area shear rigidity is a mathematical reference, not a validated upper-bound member response.",
      "No shear area factor, modulus, material suitability, capacity, or member selection is inferred.",
    ],
  };
}
