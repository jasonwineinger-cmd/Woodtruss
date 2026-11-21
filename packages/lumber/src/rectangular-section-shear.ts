/** Classical uncoupled rectangular beam shear profiles; not a wood capacity check. */
export interface RectangularShearStudyInput {
  actualWidthIn:number;
  actualDepthIn:number;
  shearAlongWidthLb:number;
  shearAlongDepthLb:number;
  /** Section coordinates in inches from the centroid, x along width and y along depth. */
  samples:readonly {xIn:number;yIn:number}[];
}

export function studyPreliminaryRectangularShear(input:RectangularShearStudyInput) {
  const {actualWidthIn:b,actualDepthIn:h,shearAlongWidthLb:Vx,shearAlongDepthLb:Vy,samples}=input;
  if (![b,h,Vx,Vy].every(Number.isFinite) || b<=0 || h<=0)
    throw new Error("Explicit finite signed shears and positive actual dimensions are required");
  if (!Array.isArray(samples) || !samples.length || samples.length > 1000)
    throw new Error("Supply one to 1000 explicit section sample points");
  const areaIn2=b*h, halfWidth=b/2, halfDepth=h/2;
  const centerWidthShearPsi=1.5*(Vx/areaIn2), centerDepthShearPsi=1.5*(Vy/areaIn2);
  if (!Number.isFinite(areaIn2) || areaIn2<=0 || !(halfWidth>0 && halfDepth>0) ||
    ![centerWidthShearPsi,centerDepthShearPsi].every(Number.isFinite))
    throw new Error("Section properties or stress exceed the usable numeric range");
  const shearSamples=samples.map(point=>{
    if (!point || ![point.xIn,point.yIn].every(Number.isFinite) ||
      Math.abs(point.xIn)>halfWidth || Math.abs(point.yIn)>halfDepth)
      throw new Error("Shear sample lies outside the actual rectangular section");
    const {xIn,yIn}=point;
    return {xIn,yIn,widthShearPsi:centerWidthShearPsi*(1-(xIn/halfWidth)**2),
      depthShearPsi:centerDepthShearPsi*(1-(yIn/halfDepth)**2)};
  });
  return {status:"PRELIMINARY_NOT_ENGINEERED" as const, actualWidthIn:b,actualDepthIn:h,areaIn2,
    shearAlongWidthLb:Vx,shearAlongDepthLb:Vy,centerWidthShearPsi,centerDepthShearPsi,shearSamples,
    signConvention:"Local centroidal x runs along width and y along depth; each shear stress has the sign of the corresponding supplied force.",
    approvedForStructuralUse:false as const,
    warnings:["Ideal parabolic profiles for a homogeneous prismatic rectangular beam, not an NDS or material-specific stress assessment.",
      "No torsion, load interaction, grain effects, notches, bearing, connections or capacity checks are included."]};
}
