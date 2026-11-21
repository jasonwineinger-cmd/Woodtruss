import { studyPreliminaryRectangularSection } from "./rectangular-section-mechanics.js";

export interface RectangularEccentricAxialInput {
  actualWidthIn:number;
  actualDepthIn:number;
  axialForceLb:number;
  /** Signed offsets of the force line from the centroid, along width x and depth y. */
  eccentricityAlongWidthIn:number;
  eccentricityAlongDepthIn:number;
}

/** Ideal elastic resultant mapping, not a connection eccentricity model or a capacity check. */
export function studyRectangularEccentricAxial(input:RectangularEccentricAxialInput) {
  const {actualWidthIn,actualDepthIn,axialForceLb:N,eccentricityAlongWidthIn:x,eccentricityAlongDepthIn:y}=input;
  if (![N,x,y].every(Number.isFinite)) throw new Error("An explicit finite axial force and both signed eccentricities are required");
  // Match the normal-stress study's moment convention:
  // integral(x * sigma dA)=My, integral(y * sigma dA)=-Mx.
  const momentAboutWidthLbIn=N === 0 || y === 0 ? 0 : -N*y;
  const momentAboutDepthLbIn=N === 0 || x === 0 ? 0 : N*x;
  if (![momentAboutWidthLbIn,momentAboutDepthLbIn].every(Number.isFinite))
    throw new Error("Mapped eccentric moment exceeds the usable numeric range");
  const stress=studyPreliminaryRectangularSection({
    actualWidthIn,actualDepthIn,axialForceLb:N,momentAboutWidthLbIn,momentAboutDepthLbIn,
  });
  return {...stress, eccentricityAlongWidthIn:x,eccentricityAlongDepthIn:y,
    momentBasis:"Stress resultants use the study sign convention; their first moments are N*x and N*y.",
    warnings:[...stress.warnings,
      "Eccentricity is a caller-specified ideal resultant, not a connection detail, local bearing, torsion or second-order assessment."]};
}
