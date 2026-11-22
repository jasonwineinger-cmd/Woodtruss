/** Isolated, prismatic Euler–Bernoulli beam under one centered point force.
 * A numerical comparison model only; not a modeled truss chord or a physical
 * fit, strength, stability, shear deformation, or connection check. */
export interface SymmetricBeamDeflectionInput {
  modelId:string;
  modelRevision:string;
  provenance:string;
  /** Global-X stations in inches, positive Y upward. */
  leftBearingXIn:number;
  rightBearingXIn:number;
  forceXIn:number;
  forceYLb:number;
  elasticModulusPsi:number;
  secondMomentIn4:number;
  gages:readonly {id:string;xIn:number}[];
}
const text=(value:string)=>typeof value==="string"&&value.length>0&&value.trim()===value;

export function benchmarkSymmetricBeamDeflection(input:SymmetricBeamDeflectionInput) {
  const {modelId,modelRevision,provenance,leftBearingXIn:left,rightBearingXIn:right,
    forceXIn,forceYLb,elasticModulusPsi:E,secondMomentIn4:I,gages}=input;
  if(![modelId,modelRevision,provenance].every(text))throw new Error("Exact ideal beam model revision and provenance required");
  const spanIn=right-left;
  if(![left,right,spanIn,forceXIn,forceYLb,E,I].every(Number.isFinite)||spanIn<=0||E<=0||I<=0)
    throw new Error("Invalid ideal beam span, force or elastic properties");
  if(spanIn>600)throw new Error("Ideal beam horizontal span exceeds 50 ft");
  const centerXIn=left+spanIn/2;
  if(forceXIn!==centerXIn||!(centerXIn>left&&centerXIn<right))
    throw new Error("Only an exact centered force on the declared bearing span is supported");
  if(!gages.length||gages.some(g=>!text(g.id)||!Number.isFinite(g.xIn)||g.xIn<left||g.xIn>right)||
    new Set(gages.map(g=>g.id)).size!==gages.length)
    throw new Error("Unique exact gages within the bearing span required");

  const stiffness=E*I;
  if(!Number.isFinite(stiffness)||stiffness<=0)throw new Error("Ideal beam stiffness outside finite range");
  const centerYIn=(forceYLb/stiffness)*(spanIn**3/48);
  if(!Number.isFinite(centerYIn)||(forceYLb!==0&&centerYIn===0))throw new Error("Ideal beam deflection outside finite range");
  // For normalized distance t measured from the nearer simple support:
  // v/v_center = t(3-4t²), 0 <= t <= 1/2.
  const observations=gages.map(({id,xIn})=>{
    const t=Math.min(xIn-left,right-xIn)/spanIn;
    const deltaYIn=t===0||forceYLb===0?0:centerYIn*t*(3-4*t*t);
    if(!Number.isFinite(deltaYIn))throw new Error("Ideal beam gage deflection outside finite range");
    return {id,xIn,deltaYIn};
  });
  const reactionYLb=forceYLb===0?0:-forceYLb/2;
  return {modelId,modelRevision,provenance,spanIn,centerXIn,centerYIn,
    bearings:[{xIn:left,reactionYLb},{xIn:right,reactionYLb}],observations,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    physicalMatchVerified:false as const,manufacturingApproved:false as const,
    warnings:["Ideal simply supported, prismatic beam with one global-Y centered force; no member design or release."]};
}
