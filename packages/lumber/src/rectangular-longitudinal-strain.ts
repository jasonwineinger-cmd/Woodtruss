import { studyPreliminaryRectangularSection, type RectangularSectionStudyInput } from "./rectangular-section-mechanics.js";

export interface RectangularLongitudinalStrainInput extends RectangularSectionStudyInput {
  /** Uniform, explicitly supplied ideal longitudinal modulus. Never sourced or assumed here. */
  longitudinalModulusPsi: number;
}

/** Ideal longitudinal strain in a centered, homogeneous rectangle under
 * signed axial force and biaxial bending. No allowable strain or adequacy. */
export function studyRectangularLongitudinalStrain(input: RectangularLongitudinalStrainInput) {
  const E = input.longitudinalModulusPsi;
  if (!Number.isFinite(E) || E <= 0) throw new Error("An explicit positive finite longitudinal modulus is required");
  const stress = studyPreliminaryRectangularSection(input);
  const { section } = stress;
  // ε(x,y) = centroid + slopeX*x + slopeY*y, matching the stress study signs.
  const centroidStrain = input.axialForceLb/section.areaIn2/E;
  const strainGradientAlongWidthPerIn = input.momentAboutDepthLbIn/section.inertiaAboutDepthIn4/E;
  const strainGradientAlongDepthPerIn = -input.momentAboutWidthLbIn/section.inertiaAboutWidthIn4/E;
  const cornerStrains = stress.peakAxialFiberStresses.map(fiber=>({
    xIn:fiber.xIn,yIn:fiber.yIn,
    axialStrain: fiber.axialPsi/E,
    widthMomentStrain: fiber.widthMomentPsi/E,
    depthMomentStrain: fiber.depthMomentPsi/E,
    combinedLongitudinalStrain: fiber.combinedNormalPsi/E,
  }));
  if (![centroidStrain,strainGradientAlongWidthPerIn,strainGradientAlongDepthPerIn,
    ...cornerStrains.flatMap(({axialStrain,widthMomentStrain,depthMomentStrain,combinedLongitudinalStrain})=>
      [axialStrain,widthMomentStrain,depthMomentStrain,combinedLongitudinalStrain])].every(Number.isFinite))
    throw new Error("Longitudinal strain exceeds the usable numeric range");
  return {
    status:"PRELIMINARY_NOT_ENGINEERED" as const, section, longitudinalModulusPsi:E,
    strainUnit:"in/in" as const, gradientUnit:"1/in" as const,
    centroidStrain,strainGradientAlongWidthPerIn,strainGradientAlongDepthPerIn,cornerStrains,
    maxTensileStrain:Math.max(0,...cornerStrains.map(fiber=>fiber.combinedLongitudinalStrain)),
    maxCompressiveStrainMagnitude:Math.max(0,...cornerStrains.map(fiber=>-fiber.combinedLongitudinalStrain)),
    signConvention:stress.signConvention, approvedForStructuralUse:false as const,
    warnings:["Ideal longitudinal elastic strain only using the supplied uniform modulus.",
      "No shear strain, transverse strain, load-life effects, allowable strain, stability or code/structural approval is evaluated."],
  };
}
