import {
  recoverElasticFrameSectionDemand, type ElasticFrameSectionDemandInput,
} from "./elastic-frame-section-demand.js";

export type ElasticFrameRectangularStressStation = {
  stationIn:number;
  side:"left"|"right"|"continuous";
};

const range=()=>new Error("Rectangular frame stress station exceeds the usable numeric range");

function faceDerivativeThreshold(qx:number,depth:number) {
  if(qx===0)return 0;
  for(const option of [(qx*depth)/6,(qx/6)*depth,qx*(depth/6)])
    if(Number.isFinite(option)&&option!==0)return Math.abs(option);
  throw range();
}

/** Exact candidate stations of the two gross elastic normal stress faces.
 * For sigma=N/A ± M/S, N'=-qx and M'=-V on each side of a point load;
 * stationary stress therefore needs V=±qx*S/A=±qx*h/6 for a rectangle.
 * Piecewise linear V yields at most one strict interior root per face per
 * branch. Both one-sided point cuts, and the physical ends, remain separate.
 * This is not a capacity/grade check and does not evaluate stress values. */
export function elasticFrameRectangularStressStations(
  input:ElasticFrameSectionDemandInput, depthIn:number,
):ElasticFrameRectangularStressStation[] {
  if(!Number.isFinite(depthIn)||depthIn<=0)throw new Error("Positive finite rectangular bending depth required");
  const {sections}=recoverElasticFrameSectionDemand(input);
  const {lengthIn:L,point,uniform}=input;
  const threshold=faceDerivativeThreshold(uniform?.qxLbPerIn??0,depthIn);
  const targets=threshold===0?[0]:[-threshold,threshold];
  function endpoint(stationIn:number,side:ElasticFrameRectangularStressStation["side"]) {
    const cut=sections.find(row=>row.stationIn===stationIn&&row.side===side);
    if(!cut)throw range();
    return cut.shearLb;
  }
  function interior(
    from:number,to:number,fromSide:ElasticFrameRectangularStressStation["side"],
    toSide:ElasticFrameRectangularStressStation["side"],
  ):ElasticFrameRectangularStressStation[] {
    const v0=endpoint(from,fromSide),v1=endpoint(to,toSide);
    const roots:number[]=[];
    if((uniform?.qyLbPerIn??0)===0)return [];
    if(v0===v1&&targets.includes(v0))throw range();
    for(const target of targets) {
      if(!((v0<target&&target<v1)||(v1<target&&target<v0)))continue;
      const distance0=Math.abs(target-v0),distance1=Math.abs(v1-target);
      // Preserve close differences computed directly; only scale before
      // subtraction when the opposite-sign difference overflows.
      const scale=Math.max(Math.abs(v0),Math.abs(v1),Math.abs(target));
      const d0=Number.isFinite(distance0)?distance0/scale:Math.abs(target/scale-v0/scale);
      const d1=Number.isFinite(distance1)?distance1/scale:Math.abs(v1/scale-target/scale);
      if(!(d0>0&&d1>0))throw range();
      const h=to-from;
      const x=d0<=d1?from+h*(d0/(d0+d1)):to-h*(d1/(d0+d1));
      if(!Number.isFinite(x)||!(from<x&&x<to)||roots.includes(x))throw range();
      roots.push(x);
    }
    return roots.sort((a,b)=>a-b).map(stationIn=>({stationIn,side:"continuous"}));
  }
  const start={stationIn:0,side:"continuous"} as const,end={stationIn:L,side:"continuous"} as const;
  if(!point)return [start,...interior(0,L,"continuous","continuous"),end];
  const a=point.stationIn;
  return [start,...interior(0,a,"continuous","left"),{stationIn:a,side:"left"},{stationIn:a,side:"right"},
    ...interior(a,L,"right","continuous"),end];
}
