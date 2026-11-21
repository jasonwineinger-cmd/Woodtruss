import type {TrussModel} from "./index.js";

/** Pure geometry and load input invariants. No engineering design approval. */
export interface AnalysisInputAudit {
 valid:boolean;
 issues:string[];
 status:"PRELIMINARY_NOT_ENGINEERED";
}
export function auditAnalysisInputs(model:TrussModel):AnalysisInputAudit {
 const issues:string[]=[];
 const ids=new Set(model.nodes.map(n=>n.id));
 for(const n of model.nodes){
  if(!Number.isFinite(n.x)||!Number.isFinite(n.y))issues.push("Nonfinite node coordinate");
 }
 for(const b of model.bars){
  if(!ids.has(b.a)||!ids.has(b.b))issues.push("Unknown member endpoint");
  if(!Number.isFinite(b.areaIn2)||b.areaIn2<=0)issues.push("Invalid area");
  if(!Number.isFinite(b.elasticModulusPsi)||b.elasticModulusPsi<=0)issues.push("Invalid modulus");
 }
 for(const l of model.loads){
  if(!ids.has(l.nodeId))issues.push("Unknown load node");
  if(!Number.isFinite(l.fxLb??0)||!Number.isFinite(l.fyLb??0))
   issues.push("Nonfinite applied force");
 }
 for(const s of model.supports){
  if(!ids.has(s.nodeId))issues.push("Unknown support node");
 }
 return {valid:issues.length===0,issues,status:"PRELIMINARY_NOT_ENGINEERED"};
}
