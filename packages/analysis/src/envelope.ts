import type {TrussModel,TrussResult} from "./index.js";

/** Preliminary load-case envelope, not code-prescribed combinations. */
export interface NamedCase { id:string; model:TrussModel; result:TrussResult }
export interface ForceRange { minLb:number; maxLb:number; governingMinCase:string; governingMaxCase:string }
export interface LoadEnvelope {
  status:"PRELIMINARY_NOT_ENGINEERED";
  memberForces:Record<string,ForceRange>;
  reactions:Record<string,{x:ForceRange;y:ForceRange}>;
  warnings:string[];
}
function range(entries:{caseId:string;value:number}[]):ForceRange {
 if(!entries.length||entries.some(e=>!Number.isFinite(e.value)))throw new Error("Invalid envelope values");
 let low=entries[0],high=entries[0];
 for(const e of entries){if(e.value<low.value)low=e;if(e.value>high.value)high=e;}
 return {minLb:low.value,maxLb:high.value,governingMinCase:low.caseId,governingMaxCase:high.caseId};
}
export function envelopePreliminaryCases(cases:NamedCase[]):LoadEnvelope {
 if(!cases.length)throw new Error("At least one load case required");
 const ids=new Set<string>();
 const reference=cases[0].model;
 const memberIds=reference.bars.map(b=>b.id);
 const nodeIds=reference.nodes.map(n=>n.id);
 for(const item of cases){
   if(!item.id||ids.has(item.id))throw new Error("Duplicate or missing load case ID");
   ids.add(item.id);
   if(item.result.status!=="PRELIMINARY_NOT_ENGINEERED")throw new Error("Unexpected result status");
   if(item.model.nodes.length!==reference.nodes.length||
      item.model.bars.length!==reference.bars.length)throw new Error("Different model topology");
   for(let i=0;i<nodeIds.length;i++){
     const a=reference.nodes[i],b=item.model.nodes[i];
     if(a.id!==b.id||a.x!==b.x||a.y!==b.y)throw new Error("Different node geometry");
   }
   for(let i=0;i<memberIds.length;i++){
     const a=reference.bars[i],b=item.model.bars[i];
     if(a.id!==b.id||a.a!==b.a||a.b!==b.b||
        a.areaIn2!==b.areaIn2||a.elasticModulusPsi!==b.elasticModulusPsi)
       throw new Error("Different member model");
   }
   if(JSON.stringify(item.model.supports)!==JSON.stringify(reference.supports))
     throw new Error("Different support conditions");
   if(Object.keys(item.result.axialForceLb).length!==memberIds.length||
      Object.keys(item.result.reactionLb).length!==nodeIds.length)
     throw new Error("Incomplete solver result");
 }
 const memberForces:Record<string,ForceRange>={};
 for(const id of memberIds)memberForces[id]=range(cases.map(c=>({caseId:c.id,value:c.result.axialForceLb[id]})));
 const reactions:LoadEnvelope["reactions"]={};
 for(const id of nodeIds){
   reactions[id]={
     x:range(cases.map(c=>({caseId:c.id,value:c.result.reactionLb[id]?.x}))),
     y:range(cases.map(c=>({caseId:c.id,value:c.result.reactionLb[id]?.y})))
   };
 }
 return {status:"PRELIMINARY_NOT_ENGINEERED",memberForces,reactions,
   warnings:["Case envelope is not a code-prescribed load combination.",
     "Strength, stability, connection, bracing and deflection design checks remain unverified."]};
}
