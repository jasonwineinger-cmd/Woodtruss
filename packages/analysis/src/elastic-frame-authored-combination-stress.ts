import { buildAuthoredElasticFrameLoadCombinations } from "./elastic-frame-authored-load-combinations.js";
import { studyAuthoredElasticFrameStressCases, type AuthoredElasticFrameStressCasesInput } from "./elastic-frame-authored-stress-cases.js";

export type AuthoredElasticFrameCombinationStressInput =
  Parameters<typeof buildAuthoredElasticFrameLoadCombinations>[0] &
  Pick<AuthoredElasticFrameStressCasesInput,"frame"|"members">;

const exact = (v:unknown,keys:readonly string[]) =>
  v !== null && typeof v === "object" &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null) &&
  Reflect.ownKeys(v).length === keys.length && keys.every(key => Object.prototype.propertyIsEnumerable.call(v,key));

/** Explicit supplied factors on one authored frame. This is not a code
 * combination library, a source authenticity check, or a capacity decision. */
export function studyAuthoredElasticFrameCombinationStress(input: AuthoredElasticFrameCombinationStressInput) {
  if (!exact(input,["modelId","modelRevision","frame","sources","combinations","members"]) ||
      !exact(input.frame,["nodes","members","supports"])) {
    throw new Error("Exact authored frame, model, sources, combinations and member selection are required");
  }
  const {modelId,modelRevision,frame,sources,combinations,members}=input;
  const authored=buildAuthoredElasticFrameLoadCombinations({modelId,modelRevision,sources,combinations});
  const study=studyAuthoredElasticFrameStressCases({modelId,modelRevision,frame,cases:authored.cases,members});

  // A declared but uncombined source is not solved. Check its target identity
  // and bounded action geometry separately so it cannot silently reference a
  // different model or claim unsupported localization in this inspection.
  const nodes=new Map(frame.nodes.map(node=>[node.id,node]));
  const frameMembers=new Map(frame.members.map(member=>[member.id,member]));
  const span=(memberId:string)=>{
    const member=frameMembers.get(memberId);
    if(!member)throw new Error("Source action does not reference an exact member of the shared frame");
    const a=nodes.get(member.startNodeId)!,b=nodes.get(member.endNodeId)!;
    return {lengthIn:Math.hypot(b.xIn-a.xIn,b.yIn-a.yIn),horizontal:b.xIn!==a.xIn};
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
  return {...study,combinationProvenance:authored.provenance};
}
