import type {TrussModel,TrussResult} from "./index.js";

/** Independent global equilibrium audit for 2D truss solver results.
 * Forces are pounds, coordinates inches, moments pound-inches.
 * A passing audit is necessary but not sufficient for engineering validity.
 */
export interface EquilibriumAudit {
  sumFxLb:number;
  sumFyLb:number;
  sumMomentAboutOriginLbIn:number;
  forceToleranceLb:number;
  momentToleranceLbIn:number;
  passes:boolean;
  status:"PRELIMINARY_NOT_ENGINEERED";
}
export function auditGlobalEquilibrium(
 model:TrussModel,result:TrussResult,
 forceToleranceLb=1e-5,momentToleranceLbIn=1e-3
):EquilibriumAudit {
  if(!Number.isFinite(forceToleranceLb)||forceToleranceLb<0||
     !Number.isFinite(momentToleranceLbIn)||momentToleranceLbIn<0)
    throw new Error("Invalid equilibrium tolerances");
  const nodes=new Map(model.nodes.map(n=>[n.id,n]));
  let sumFxLb=0,sumFyLb=0,sumMomentAboutOriginLbIn=0;
  const accumulate=(nodeId:string,fx:number,fy:number)=>{
    const node=nodes.get(nodeId);
    if(!node||![node.x,node.y,fx,fy].every(Number.isFinite))
      throw new Error("Invalid equilibrium node or force");
    sumFxLb+=fx;sumFyLb+=fy;
    sumMomentAboutOriginLbIn+=node.x*fy-node.y*fx;
  };
  for(const load of model.loads)accumulate(load.nodeId,load.fxLb??0,load.fyLb??0);
  for(const [nodeId,reaction] of Object.entries(result.reactionLb))
    accumulate(nodeId,reaction.x,reaction.y);
  const passes=Math.abs(sumFxLb)<=forceToleranceLb&&
    Math.abs(sumFyLb)<=forceToleranceLb&&
    Math.abs(sumMomentAboutOriginLbIn)<=momentToleranceLbIn;
  return {sumFxLb,sumFyLb,sumMomentAboutOriginLbIn,forceToleranceLb,
    momentToleranceLbIn,passes,status:"PRELIMINARY_NOT_ENGINEERED"};
}
