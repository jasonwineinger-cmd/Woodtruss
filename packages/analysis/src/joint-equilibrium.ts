import type {TrussModel} from "./index.js";

/** Verifies independent 2D joint force balance from solved axial member forces.
 * Unlike global equilibrium, this can detect incorrect internal force reporting.
 * Units: lb, inches. Numerical verification only; NOT code design approval.
 */
export interface JointEquilibriumCheck {
 nodeId:string; residualFxLb:number; residualFyLb:number; residualMagnitudeLb:number;
}
export interface JointEquilibriumAudit {
 status:"PRELIMINARY_NOT_ENGINEERED";
 passes:boolean;
 maximumResidualLb:number;
 joints:JointEquilibriumCheck[];
}
export function auditJointEquilibrium(
 model:TrussModel,
 axialForceLb:Record<string,number>,
 reactions:Record<string,{x:number;y:number}>,
 toleranceLb=1e-5
):JointEquilibriumAudit {
 if(!Number.isFinite(toleranceLb)||toleranceLb<0)throw new Error("Invalid joint equilibrium tolerance");
 const coords=new Map(model.nodes.map(n=>[n.id,n]));
 if(coords.size!==model.nodes.length)throw new Error("Duplicate joint IDs");
 const sums=new Map(model.nodes.map(n=>[n.id,{x:0,y:0}]));
 for(const bar of model.bars){
   const a=coords.get(bar.a),b=coords.get(bar.b);
   const axial=axialForceLb[bar.id];
   if(!a||!b||!Number.isFinite(axial))throw new Error("Invalid member force");
   const length=Math.hypot(b.x-a.x,b.y-a.y);
   if(!Number.isFinite(length)||length<=0)throw new Error("Invalid member length");
   const fx=axial*(b.x-a.x)/length,fy=axial*(b.y-a.y)/length;
   sums.get(bar.a)!.x+=fx;sums.get(bar.a)!.y+=fy;
   sums.get(bar.b)!.x-=fx;sums.get(bar.b)!.y-=fy;
 }
 for(const load of model.loads){
   const s=sums.get(load.nodeId);
   if(!s||!Number.isFinite(load.fxLb??0)||!Number.isFinite(load.fyLb??0))
     throw new Error("Invalid applied joint load");
   s.x+=load.fxLb??0;s.y+=load.fyLb??0;
 }
 for(const [id,reaction] of Object.entries(reactions)){
   const s=sums.get(id);
   if(!s||!Number.isFinite(reaction.x)||!Number.isFinite(reaction.y))
     throw new Error("Invalid support reaction");
   s.x+=reaction.x;s.y+=reaction.y;
 }
 const joints=model.nodes.map(n=>{
   const s=sums.get(n.id)!;
   return {nodeId:n.id,residualFxLb:s.x,residualFyLb:s.y,
     residualMagnitudeLb:Math.hypot(s.x,s.y)};
 });
 const maximumResidualLb=Math.max(0,...joints.map(j=>j.residualMagnitudeLb));
 return {status:"PRELIMINARY_NOT_ENGINEERED",passes:maximumResidualLb<=toleranceLb,
   maximumResidualLb,joints};
}
