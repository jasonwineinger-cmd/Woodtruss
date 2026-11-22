import type {TrussModel} from "./index.js";
import {distributeExplicitMemberLineLoad,type ExplicitMemberLineLoad} from "./member-line-load.js";
import {aggregateExplicitNodalLoadChannels} from "./load-source-aggregation.js";

export interface ExplicitChainLineLoad {
  /** Directed node path and exactly one modeled bar for each adjacent pair. */
  orderedNodeIds:readonly string[];
  orderedMemberIds:readonly string[];
  /** Cumulative traveled length along the path, not endpoint separation. */
  fromIn:number;
  toIn:number;
  from:ExplicitMemberLineLoad["from"];
  to:ExplicitMemberLineLoad["to"];
  provenance:string;
}

/** Piecewise-straight path extension of the single-member line load.
 * Intensity varies linearly over travelled length in signed global axes. */
export function distributeExplicitMemberChainLineLoad(model:Pick<TrussModel,"nodes"|"bars">,input:ExplicitChainLineLoad) {
  const {orderedNodeIds,orderedMemberIds,fromIn,toIn,from,to,provenance}=input;
  if(typeof provenance!=="string"||!provenance.trim())throw new Error("Chain line-load provenance required");
  if(orderedMemberIds.length<2||orderedMemberIds.length+1!==orderedNodeIds.length||
    new Set(orderedNodeIds).size!==orderedNodeIds.length||new Set(orderedMemberIds).size!==orderedMemberIds.length)
    throw new Error("Explicit connected chain requires unique nodes and at least two unique member IDs");
  const nodes=new Map(model.nodes.map(n=>[n.id,n]));
  if(nodes.size!==model.nodes.length)throw new Error("Duplicate model node ID");
  let run=0;
  const chain=orderedMemberIds.map((memberId,i)=>{
    const a=nodes.get(orderedNodeIds[i]),b=nodes.get(orderedNodeIds[i+1]);
    if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))throw new Error("Missing or invalid chain node");
    const matches=model.bars.filter(bar=>(bar.a===a.id&&bar.b===b.id)||(bar.b===a.id&&bar.a===b.id));
    if(matches.length!==1||matches[0].id!==memberId||model.bars.filter(bar=>bar.id===memberId).length!==1)
      throw new Error("Chain interval does not match one unique modeled member: "+memberId);
    const length=Math.hypot(b.x-a.x,b.y-a.y),start=run;
    run+=length;
    if(length<=0||!Number.isFinite(run)||run<=start)throw new Error("Invalid modeled chain length");
    return {memberId,length,start,end:run,forward:matches[0].a===a.id};
  });
  if(![fromIn,toIn,from?.fxLbPerIn,from?.fyLbPerIn,to?.fxLbPerIn,to?.fyLbPerIn].every(Number.isFinite)||
    fromIn<0||toIn>run||toIn<=fromIn)
    throw new Error("Invalid chain load interval or intensity");
  const at=(s:number)=>{
    const t=(s-fromIn)/(toIn-fromIn);
    return {fxLbPerIn:from.fxLbPerIn*(1-t)+to.fxLbPerIn*t,
      fyLbPerIn:from.fyLbPerIn*(1-t)+to.fyLbPerIn*t};
  };
  const segments=chain.flatMap(segment=>{
    const a=Math.max(fromIn,segment.start),b=Math.min(toIn,segment.end);
    if(a>=b)return [];
    // Use exact member bounds when the loaded interval reaches a joint.
    const localA=a===segment.start?0:a-segment.start;
    const localB=b===segment.end?segment.length:b-segment.start;
    const resolved=distributeExplicitMemberLineLoad(model,{memberId:segment.memberId,provenance,
      fromIn:segment.forward?localA:segment.length-localB,
      toIn:segment.forward?localB:segment.length-localA,
      from:at(segment.forward?a:b),to:at(segment.forward?b:a)});
    return [{memberId:segment.memberId,chainFromIn:a,chainToIn:b,jointLoads:resolved.jointLoads}];
  });
  const aggregated=aggregateExplicitNodalLoadChannels(model,segments.map(segment=>({
    id:segment.memberId,provenance,loads:segment.jointLoads,
  })));
  return {provenance,segments,jointLoads:aggregated.jointLoads,status:"PRELIMINARY_NOT_ENGINEERED" as const,
    warnings:["Signed global-axis member-length load equivalent only; no local bending, geometric load routing, code loads, or release checked."]};
}
