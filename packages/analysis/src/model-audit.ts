import type {TrussModel,TrussResult} from "./index.js";

/** Checks numerical model quality, without implying code compliance. */
export interface ModelAudit {
  valid:boolean;
  issues:string[];
  nodeCount:number;
  memberCount:number;
  status:"PRELIMINARY_NOT_ENGINEERED";
}
export function auditTrussModel(model:TrussModel):ModelAudit {
  const issues:string[]=[];
  const ids=new Set<string>();
  for(const node of model.nodes){
    if(!node.id || ids.has(node.id))issues.push("Missing or duplicate node ID");
    ids.add(node.id);
    if(!Number.isFinite(node.x)||!Number.isFinite(node.y))issues.push("Nonfinite node coordinate");
  }
  const members=new Set<string>();
  const adjacency=new Map(model.nodes.map(n=>[n.id,new Set<string>()]));
  for(const member of model.bars){
    if(!member.id||members.has(member.id))issues.push("Missing or duplicate member ID");
    members.add(member.id);
    if(!ids.has(member.a)||!ids.has(member.b)||member.a===member.b){
      issues.push("Invalid member endpoints");continue;
    }
    adjacency.get(member.a)!.add(member.b);
    adjacency.get(member.b)!.add(member.a);
    if(!Number.isFinite(member.areaIn2)||member.areaIn2<=0||
       !Number.isFinite(member.elasticModulusPsi)||member.elasticModulusPsi<=0)
      issues.push("Invalid member stiffness");
    const a=model.nodes.find(n=>n.id===member.a)!;
    const b=model.nodes.find(n=>n.id===member.b)!;
    if(Math.hypot(a.x-b.x,a.y-b.y)<1e-9)issues.push("Zero-length member");
  }
  for(const load of model.loads){
    if(!ids.has(load.nodeId)||!Number.isFinite(load.fxLb??0)||!Number.isFinite(load.fyLb??0))
      issues.push("Invalid joint load");
  }
  const supportIds=new Set<string>();
  let constraints=0;
  for(const support of model.supports){
    if(!ids.has(support.nodeId)||supportIds.has(support.nodeId))
      issues.push("Unknown or repeated support node");
    supportIds.add(support.nodeId);
    constraints+=Number(support.fixX)+Number(support.fixY);
  }
  if(constraints<3)issues.push("Fewer than three restrained planar degrees of freedom");
  if(model.nodes.length===0)issues.push("No nodes");
  else {
    const seen=new Set<string>(),queue=[model.nodes[0].id];
    while(queue.length){
      const id=queue.shift()!;
      if(seen.has(id))continue;
      seen.add(id);
      for(const next of adjacency.get(id)??[])if(!seen.has(next))queue.push(next);
    }
    if(seen.size!==ids.size)issues.push("Disconnected or isolated nodes");
  }
  // A counting rule only: sufficient count never proves geometric stability.
  if(model.bars.length+constraints<2*model.nodes.length)
    issues.push("Insufficient member/support count for planar pin-jointed stability");
  return {valid:issues.length===0,issues,nodeCount:model.nodes.length,
    memberCount:model.bars.length,status:"PRELIMINARY_NOT_ENGINEERED"};
}
export function assertAuditedTrussModel(model:TrussModel):void {
  const audit=auditTrussModel(model);
  if(!audit.valid)throw new Error("Truss model audit failed: "+audit.issues.join("; "));
}
