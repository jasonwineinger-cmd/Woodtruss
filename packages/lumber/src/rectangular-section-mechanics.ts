/** Centered rectangular, ideal linear normal stress only. No material properties,
 * allowable stresses, combined-code interaction, connection or stability checks. */
export interface RectangularSectionStudyInput {
  actualWidthIn: number;
  actualDepthIn: number;
  axialForceLb: number;
  momentAboutWidthLbIn: number;
  momentAboutDepthLbIn: number;
}

export function studyPreliminaryRectangularSection(input: RectangularSectionStudyInput) {
  const {actualWidthIn:b,actualDepthIn:h,axialForceLb:N,momentAboutWidthLbIn:Mx,momentAboutDepthLbIn:My}=input;
  if (![b,h,N,Mx,My].every(Number.isFinite) || b <= 0 || h <= 0)
    throw new Error("Explicit finite forces, moments and positive actual section dimensions are required");
  const areaIn2=b*h;
  const inertiaAboutWidthIn4=b*h**3/12, inertiaAboutDepthIn4=h*b**3/12;
  const modulusAboutWidthIn3=inertiaAboutWidthIn4/(h/2), modulusAboutDepthIn3=inertiaAboutDepthIn4/(b/2);
  if (![areaIn2,inertiaAboutWidthIn4,inertiaAboutDepthIn4,modulusAboutWidthIn3,modulusAboutDepthIn3]
    .every(v=>Number.isFinite(v)&&v>0))
    throw new Error("Section properties exceed the usable numeric range");
  const axialPsi=N/areaIn2;
  const widthMomentEdgePsi=Mx/modulusAboutWidthIn3, depthMomentEdgePsi=My/modulusAboutDepthIn3;
  const peakAxialFiberStresses = ([-1,1] as const).flatMap(xSign=>([-1,1] as const).map(ySign=>{
    const widthMomentPsi=-ySign*widthMomentEdgePsi;
    const depthMomentPsi=xSign*depthMomentEdgePsi;
    const combinedNormalPsi=axialPsi+widthMomentPsi+depthMomentPsi;
    if (![axialPsi,widthMomentPsi,depthMomentPsi,combinedNormalPsi].every(Number.isFinite))
      throw new Error("Computed fiber stress exceeds the usable numeric range");
    return {xIn:xSign*b/2,yIn:ySign*h/2,axialPsi,widthMomentPsi,depthMomentPsi,combinedNormalPsi};
  }));
  return {
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    section:{actualWidthIn:b,actualDepthIn:h,areaIn2,inertiaAboutWidthIn4,inertiaAboutDepthIn4,
      modulusAboutWidthIn3,modulusAboutDepthIn3},
    input:{axialForceLb:N,momentAboutWidthLbIn:Mx,momentAboutDepthLbIn:My},
    peakAxialFiberStresses,
    maxTensionPsi:Math.max(0,...peakAxialFiberStresses.map(row=>row.combinedNormalPsi)),
    maxCompressionMagnitudePsi:Math.max(0,...peakAxialFiberStresses.map(row=>-row.combinedNormalPsi)),
    signConvention:"Centroid origin, x along width, y along depth; tensile normal stress positive; positive Mx compresses +y and positive My tensions +x.",
    approvedForStructuralUse:false as const,
    warnings:[
      "The ideal linear stress calculation assumes an unnotched rectangle with loads about centroidal axes.",
      "No design capacity, allowable stress, standard check, stability, connection detail or sizing approval is evaluated.",
    ],
  };
}
