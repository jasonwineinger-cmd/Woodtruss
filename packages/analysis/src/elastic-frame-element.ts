export interface ElasticFrameElementProperties {
  lengthIn:number;
  areaIn2:number;
  secondMomentIn4:number;
  elasticModulusPsi:number;
  releaseLeftRotation:boolean;
  releaseRightRotation:boolean;
}

/** Local planar prismatic Euler–Bernoulli element. Axial + bending only;
 * no shear flexibility, geometric stiffness, end-force recovery, assembly,
 * boundary solution, timber connection behavior or fabrication authorization. */
export function elasticFrameElementLocalStiffness(properties:ElasticFrameElementProperties) {
  const {lengthIn:L,areaIn2:A,secondMomentIn4:I,elasticModulusPsi:E,
    releaseLeftRotation,releaseRightRotation}=properties;
  if(![L,A,I,E].every(value=>Number.isFinite(value)&&value>0)||
     typeof releaseLeftRotation!=="boolean"||typeof releaseRightRotation!=="boolean")
    throw new Error("Finite positive elastic frame properties and explicit end rotation releases required");

  const axial=E*A/L,rotation=E*I/L;
  const flexuralTranslation=12*(rotation/L)/L,coupling=6*(rotation/L);
  const endRotation=4*rotation,oppositeRotation=2*rotation;
  if(![axial,flexuralTranslation,coupling,endRotation,oppositeRotation]
     .every(value=>Number.isFinite(value)&&value>0))
    throw new Error("Elastic frame stiffness coefficients outside finite positive numerical range");

  const matrix=[
    [axial,0,0,-axial,0,0],
    [0,flexuralTranslation,coupling,0,-flexuralTranslation,coupling],
    [0,coupling,endRotation,0,-coupling,oppositeRotation],
    [-axial,0,0,axial,0,0],
    [0,-flexuralTranslation,-coupling,0,flexuralTranslation,-coupling],
    [0,coupling,oppositeRotation,0,-coupling,endRotation],
  ];
  const releases=[...(releaseLeftRotation?[2]:[]),...(releaseRightRotation?[5]:[])];
  // Eliminate released section rotations at zero end moment rather than
  // holding them at zero. Retain zero rows/columns only as layout placeholders.
  for(const released of releases) {
    const pivot=matrix[released][released];
    if(!Number.isFinite(pivot)||pivot<=0)throw new Error("Invalid released rotation stiffness pivot");
    for(let i=0;i<6;i++){
      if(i===released)continue;
      for(let j=i;j<6;j++){
        if(j===released)continue;
        const next=matrix[i][j]-(matrix[i][released]/pivot)*matrix[released][j];
        if(!Number.isFinite(next))throw new Error("Nonfinite static condensation");
        matrix[i][j]=matrix[j][i]=next===0?0:next;
      }
    }
    for(let i=0;i<6;i++)matrix[i][released]=matrix[released][i]=0;
  }
  // With both end moments free, only axial stiffness remains. The exact
  // analytical zero avoids retaining floating-point residual bending terms.
  if(releases.length===2)
    for(const i of [1,2,4,5])for(const j of [1,2,4,5])matrix[i][j]=0;
  return {localDofOrder:["uLeft","vLeft","thetaLeft","uRight","vRight","thetaRight"] as const,
    localAxes:"X from left end to right end; Y transverse; positive rotations counterclockwise" as const,
    releasedRotationIndices:releases,matrix,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,shearDeformationModeled:false as const,
    globalAssemblyVerified:false as const,manufacturingApproved:false as const};
}
