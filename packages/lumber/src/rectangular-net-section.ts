export interface RectangularSectionVoid {
  id:string;
  /** Explicit faces from the gross rectangle's lower-left datum. */
  leftIn:number;
  bottomIn:number;
  rightIn:number;
  topIn:number;
}
export interface RectangularNetSectionInput {
  grossWidthIn:number;
  grossDepthIn:number;
  voids:readonly RectangularSectionVoid[];
}
const positive=(n:number)=>Number.isFinite(n)&&n>0;

/** Geometry only: subtract explicit, disjoint axis-aligned rectangles.
 * A boundary-touching void is permitted; physical continuity is not inferred. */
export function studyRectangularNetSection(input:RectangularNetSectionInput) {
  const {grossWidthIn:b,grossDepthIn:h,voids}=input;
  if (![b,h].every(positive) || !Array.isArray(voids) || voids.length>1000)
    throw new Error("Positive gross dimensions and an explicit bounded void list are required");
  const identities=new Set<string>();
  const geometry=(width:number,depth:number,centerX:number,centerY:number)=>{
    const area=width*depth, Ix=width*depth**3/12, Iy=depth*width**3/12;
    if (![area,Ix,Iy].every(positive)) throw new Error("Section moments exceed the usable numeric range");
    return {area,Ix,Iy,centerX,centerY};
  };
  const gross=geometry(b,h,b/2,h/2);
  const removed=Array.from(voids).map((v,i)=>{
    if (!v || typeof v.id!=="string" || !v.id.trim() || identities.has(v.id) ||
      ![v.leftIn,v.bottomIn,v.rightIn,v.topIn].every(Number.isFinite) ||
      v.leftIn<0 || v.bottomIn<0 || v.rightIn>b || v.topIn>h ||
      !(v.leftIn<v.rightIn && v.bottomIn<v.topIn))
      throw new Error("Unique void IDs and positive rectangles fully inside the gross section are required");
    for(const other of voids.slice(0,i))
      if (Math.max(v.leftIn,other.leftIn)<Math.min(v.rightIn,other.rightIn) &&
          Math.max(v.bottomIn,other.bottomIn)<Math.min(v.topIn,other.topIn))
        throw new Error("Void interiors overlap");
    identities.add(v.id);
    const width=v.rightIn-v.leftIn,depth=v.topIn-v.bottomIn;
    return geometry(width,depth,v.leftIn+width/2,v.bottomIn+depth/2);
  });
  const removedAreaIn2=removed.reduce((sum,v)=>sum+v.area,0);
  const netAreaIn2=gross.area-removedAreaIn2;
  if (!positive(netAreaIn2)) throw new Error("No positive net section remains");
  const centroidXIn=gross.centerX-removed.reduce((sum,v)=>sum+v.area*(v.centerX-gross.centerX),0)/netAreaIn2;
  const centroidYIn=gross.centerY-removed.reduce((sum,v)=>sum+v.area*(v.centerY-gross.centerY),0)/netAreaIn2;
  const moments=(shape:typeof gross)=>{
    const x=shape.centerX-centroidXIn,y=shape.centerY-centroidYIn;
    return {x:shape.Ix+shape.area*y**2,y:shape.Iy+shape.area*x**2,xy:(shape.area*x)*y};
  };
  const grossAtCentroid=moments(gross);
  const net=removed.map(moments).reduce((sum,v)=>({x:sum.x-v.x,y:sum.y-v.y,xy:sum.xy-v.xy}),grossAtCentroid);
  const coupling=(net.xy/Math.sqrt(net.x))/Math.sqrt(net.y);
  if (![net.x,net.y].every(positive) || !(centroidXIn>0 && centroidXIn<b && centroidYIn>0 && centroidYIn<h) ||
    !Number.isFinite(coupling) || Math.abs(coupling)>=1)
    throw new Error("Net section moments are nonfinite or not positive definite");
  return {status:"PRELIMINARY_NOT_ENGINEERED" as const,grossAreaIn2:gross.area,removedAreaIn2,netAreaIn2,
    centroidXIn,centroidYIn,netInertiaAboutXIn4:net.x,netInertiaAboutYIn4:net.y,netProductXYIn4:net.xy,
    axes:"Centroid coordinates from gross lower-left; Ixy is the integral of centered x*y.",
    physicalContinuityVerified:false as const,approvedForStructuralUse:false as const,
    warnings:["Author-supplied net geometry only; dimensions and void positions are not verified as built.",
      "No stress concentration, grain effects, load transfer, durability, strength or manufacturing approval is assessed."]};
}
