import type { AuthoredElasticFrameLoadSource } from "./elastic-frame-authored-load-combinations.js";
import type { ElasticFrameInput } from "./elastic-frame-solve.js";

/** Bind every authored source to the same solved frame, including sources no
 * combination references. Call after the authored builder validates the source
 * shape and the exact frame solve validates topology and supports. This does
 * not solve or authorize an unused source. */
export function assertElasticFrameAuthoredSourceTargets(
  frame: Pick<ElasticFrameInput, "nodes" | "members">,
  sources: readonly AuthoredElasticFrameLoadSource[],
): void {
  const nodes=new Map(frame.nodes.map(node=>[node.id,node]));
  const frameMembers=new Map(frame.members.map(member=>[member.id,member]));
  const span=(memberId:string)=>{
    const member=frameMembers.get(memberId);
    if(!member)throw new Error("Source action does not reference an exact member of the shared frame");
    const a=nodes.get(member.startNodeId),b=nodes.get(member.endNodeId);
    if(!a||!b)throw new Error("Source action member has missing endpoints in the shared frame");
    const lengthIn=Math.hypot(b.xIn-a.xIn,b.yIn-a.yIn);
    if(!Number.isFinite(lengthIn)||lengthIn<=0)
      throw new Error("Source action member has an invalid span in the shared frame");
    return {lengthIn,horizontal:b.xIn!==a.xIn};
  };
  for(const source of sources){
    for(const load of source.loads){
      if(!nodes.has(load.nodeId))throw new Error(`Source ${source.caseId} has an unknown shared-frame load node`);
    }
    for(const load of source.memberLoads??[]){
      if(!span(load.memberId).horizontal && load.basis==="horizontal-projection")
        throw new Error(`Source ${source.caseId} uses a zero horizontal projection`);
    }
    for(const load of source.memberPointLoads??[]){
      if(!(load.stationIn>0 && load.stationIn<span(load.memberId).lengthIn))
        throw new Error(`Source ${source.caseId} member point must be strictly within its ordered member`);
    }
  }
}
