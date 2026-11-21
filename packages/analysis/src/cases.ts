import type {TrussModel} from "./index.js";

/** Deterministic load-case generator for numerical studies, NOT ASCE 7 combinations.
 * A case specifies explicit joint loads in pounds. No code pressure is inferred.
 */
export interface ExplicitLoadCase {
  id:string;
  description:string;
  jointLoads:{nodeId:string;fxLb?:number;fyLb?:number}[];
}
export function makeExplicitLoadCase(
 base:TrussModel,caseDefinition:ExplicitLoadCase
):TrussModel {
 if(!caseDefinition.id.trim()||!caseDefinition.description.trim())
   throw new Error("Load case ID and description required");
 const nodeIds=new Set(base.nodes.map(n=>n.id));
 const jointLoads=caseDefinition.jointLoads.map(l=>{
   const fx=l.fxLb??0,fy=l.fyLb??0;
   if(!nodeIds.has(l.nodeId)||!Number.isFinite(fx)||!Number.isFinite(fy))
     throw new Error("Invalid explicit joint load");
   return {nodeId:l.nodeId,fxLb:fx,fyLb:fy};
 });
 return {
   nodes:base.nodes.map(n=>({...n})),
   bars:base.bars.map(b=>({...b})),
   supports:base.supports.map(s=>({...s})),
   loads:jointLoads
 };
}
