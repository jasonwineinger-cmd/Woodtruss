import type {JointLoad,TrussModel} from "./index.js";

/** Converts independent horizontal-projection panel pressures into nodal forces.
 * For preliminary scenario studies only: pressures are NOT code-compliant
 * unbalanced snow or wind cases. Panel i spans node i to node i+1.
 */
export interface PanelPressureInput {
  orderedTopChordNodeIds:string[];
  panelPressurePsf:number[];
  trussSpacingFt:number;
}
export function panelGravityNodalLoads(
 model:Pick<TrussModel,"nodes">, input:PanelPressureInput
):JointLoad[] {
 const {orderedTopChordNodeIds:ids,panelPressurePsf, trussSpacingFt}=input;
 if(ids.length<2 || new Set(ids).size!==ids.length || panelPressurePsf.length!==ids.length-1)
   throw new Error("Invalid panel pressure topology");
 if(!Number.isFinite(trussSpacingFt)||trussSpacingFt<=0)
   throw new Error("Invalid truss spacing");
 const lookup=new Map(model.nodes.map(n=>[n.id,n]));
 const points=ids.map(id=>{
   const n=lookup.get(id);
   if(!n || !Number.isFinite(n.x)||!Number.isFinite(n.y)) throw new Error("Unknown or invalid top chord node");
   return n;
 });
 const forces=Array<number>(ids.length).fill(0);
 for(let i=0;i<panelPressurePsf.length;i++){
   const pressure=panelPressurePsf[i];
   const dx=points[i+1].x-points[i].x;
   if(!Number.isFinite(pressure)||pressure<0||!Number.isFinite(dx)||dx<=0)
     throw new Error("Invalid panel pressure or ordering");
   const total=pressure*(dx/12)*trussSpacingFt;
   if(!Number.isFinite(total))throw new Error("Panel force overflow");
   forces[i]-=total/2; forces[i+1]-=total/2;
 }
 return ids.map((nodeId,i)=>({nodeId,fyLb:forces[i]}));
}
