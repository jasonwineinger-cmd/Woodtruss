import type {NamedCase} from "./envelope.js";

export interface DisplacementRange {
  minIn:number;
  maxIn:number;
  maximumAbsoluteIn:number;
  governingAbsoluteCase:string;
}
export interface DisplacementEnvelope {
  status:"PRELIMINARY_NOT_ENGINEERED";
  joints:Record<string,{x:DisplacementRange;y:DisplacementRange;magnitude:DisplacementRange}>;
  warnings:string[];
}
function makeRange(values:{id:string;value:number}[]):DisplacementRange {
  if(values.length===0||values.some(v=>!Number.isFinite(v.value)))
    throw new Error("Invalid displacement values");
  const minIn=Math.min(...values.map(v=>v.value));
  const maxIn=Math.max(...values.map(v=>v.value));
  const governing=values.reduce((a,b)=>Math.abs(b.value)>Math.abs(a.value)?b:a);
  return {minIn,maxIn,maximumAbsoluteIn:Math.abs(governing.value),governingAbsoluteCase:governing.id};
}
/** Envelope joint translations from compatible numerical models.
 * Does not include connector slip, chord bending, creep, or code deflection limits.
 */
export function envelopeJointDisplacements(cases:NamedCase[]):DisplacementEnvelope {
  if(!cases.length)throw new Error("At least one analysis case required");
  const reference=cases[0].model;
  const ids=reference.nodes.map(n=>n.id);
  const names=new Set<string>();
  for(const c of cases){
    if(!c.id||names.has(c.id))throw new Error("Duplicate or missing case ID");
    names.add(c.id);
    if(c.result.status!=="PRELIMINARY_NOT_ENGINEERED")
      throw new Error("Unsupported analysis status");
    if(c.model.nodes.length!==reference.nodes.length||
       c.model.bars.length!==reference.bars.length||
       c.model.supports.length!==reference.supports.length)
      throw new Error("Incompatible analysis models");
    for(let i=0;i<ids.length;i++){
      const a=reference.nodes[i],b=c.model.nodes[i];
      if(a.id!==b.id||a.x!==b.x||a.y!==b.y)
        throw new Error("Incompatible joint geometry");
    }
    for(let i=0;i<reference.bars.length;i++){
      const a=reference.bars[i],b=c.model.bars[i];
      if(a.id!==b.id||a.a!==b.a||a.b!==b.b||
         a.areaIn2!==b.areaIn2||a.elasticModulusPsi!==b.elasticModulusPsi)
        throw new Error("Incompatible member properties");
    }
    for(let i=0;i<reference.supports.length;i++){
      const a=reference.supports[i],b=c.model.supports[i];
      if(a.nodeId!==b.nodeId||a.fixX!==b.fixX||a.fixY!==b.fixY)
        throw new Error("Incompatible support conditions");
    }
    if(Object.keys(c.result.displacementIn).length!==ids.length)
      throw new Error("Incomplete joint displacement result");
  }
  const joints:DisplacementEnvelope["joints"]={};
  for(const id of ids){
    const entries=cases.map(c=>{
      const d=c.result.displacementIn[id];
      if(!d||!Number.isFinite(d.x)||!Number.isFinite(d.y))
        throw new Error("Invalid displacement for joint "+id);
      return {id:c.id,x:d.x,y:d.y,magnitude:Math.hypot(d.x,d.y)};
    });
    joints[id]={
      x:makeRange(entries.map(e=>({id:e.id,value:e.x}))),
      y:makeRange(entries.map(e=>({id:e.id,value:e.y}))),
      magnitude:makeRange(entries.map(e=>({id:e.id,value:e.magnitude})))
    };
  }
  return {status:"PRELIMINARY_NOT_ENGINEERED",joints,
    warnings:["Idealized pin-jointed translations only; not a serviceability design check.",
      "Deflection limits, creep, chord bending, and connector slip remain unverified."]};
}
