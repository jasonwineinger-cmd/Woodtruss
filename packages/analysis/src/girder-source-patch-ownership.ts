import type { TrussModel } from "./index.js";
import { aggregateExplicitNodalLoadChannels } from "./load-source-aggregation.js";

type PatchRoute = {kind:"direct"} | {kind:"carried"; carriedSupportId:string};
interface PatchBinding {
  patchId:string;
  caseId:string;
  girderId:string;
  stationIn:number;
  nodeId:string;
  /** Authored receiving face label; no bearing/attachment is inferred. */
  face:string;
  route:PatchRoute;
}
export interface GirderSourcePatchReceipt extends PatchBinding {
  fyLb:number;
  provenance:string;
}
export interface ExpectedGirderPatchCase {
  caseId:string;
  girderId:string;
  /** Model X datum from which the authored station increases. */
  stationOriginXIn:number;
  patches:readonly PatchBinding[];
}
const text=(value:string)=>typeof value==="string"&&value.trim()===value&&value.length>0;

function validate(binding:PatchBinding,expected:ExpectedGirderPatchCase){
  if(![binding.patchId,binding.caseId,binding.girderId,binding.nodeId,binding.face].every(text)||
    binding.caseId!==expected.caseId||binding.girderId!==expected.girderId||
    !Number.isFinite(binding.stationIn)||binding.stationIn<0||
    (binding.route.kind!=="direct"&&binding.route.kind!=="carried")||
    (binding.route.kind==="carried"&&!text(binding.route.carriedSupportId)))
    throw new Error("Invalid or wrong-scope girder source patch binding");
}
const sameRoute=(a:PatchRoute,b:PatchRoute)=>a.kind===b.kind&&
  (a.kind!=="carried"||(b.kind==="carried"&&a.carriedSupportId===b.carriedSupportId));

/** Check separate source identities before transferring authored signed forces.
 * Does not discover patch areas, verify carried reactions, or infer routes. */
export function aggregateOwnedGirderSourcePatches(model:Pick<TrussModel,"nodes">,
  expected:ExpectedGirderPatchCase,supplied:readonly GirderSourcePatchReceipt[]) {
  if(!text(expected.caseId)||!text(expected.girderId)||!Number.isFinite(expected.stationOriginXIn)||!expected.patches.length)
    throw new Error("Expected girder case, exact datum, and source patches required");
  const wanted=new Map<string,PatchBinding>();
  for(const patch of expected.patches){
    validate(patch,expected);
    if(wanted.has(patch.patchId))throw new Error("Duplicate expected source patch: "+patch.patchId);
    const nodes=model.nodes.filter(node=>node.id===patch.nodeId);
    if(nodes.length!==1||!Number.isFinite(nodes[0].x)||!Number.isFinite(nodes[0].y)||
       nodes[0].x-expected.stationOriginXIn!==patch.stationIn)
      throw new Error("Expected girder station does not bind to one modeled joint: "+patch.patchId);
    wanted.set(patch.patchId,patch);
  }

  const received=new Map<string,GirderSourcePatchReceipt>();
  for(const patch of supplied){
    validate(patch,expected);
    if(received.has(patch.patchId))throw new Error("Duplicate source patch in the same girder case: "+patch.patchId);
    const need=wanted.get(patch.patchId);
    if(!need||patch.stationIn!==need.stationIn||patch.nodeId!==need.nodeId||
       patch.face!==need.face||!sameRoute(patch.route,need.route))
      throw new Error("Source patch receipt disagrees with exact expected ownership: "+patch.patchId);
    if(!Number.isFinite(patch.fyLb)||!text(patch.provenance))
      throw new Error("Invalid signed patch force or provenance: "+patch.patchId);
    received.set(patch.patchId,patch);
  }
  if(received.size!==wanted.size)throw new Error("Missing independently expected girder source patch");
  const patchReceipts=[...wanted.keys()].map(id=>{
    const patch=received.get(id)!;
    return {patchId:id,caseId:patch.caseId,girderId:patch.girderId,stationIn:patch.stationIn,nodeId:patch.nodeId,
      face:patch.face,route:{...patch.route},fyLb:patch.fyLb,provenance:patch.provenance};
  });
  const aggregation=aggregateExplicitNodalLoadChannels(model,patchReceipts.map(patch=>({
    id:patch.patchId,provenance:patch.provenance,loads:[{nodeId:patch.nodeId,fyLb:patch.fyLb}],
  })));
  return {caseId:expected.caseId,girderId:expected.girderId,patchReceipts,jointLoads:aggregation.jointLoads,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    patchAreaVerified:false as const,carriedReactionVerified:false as const,manufacturingApproved:false as const,
    warnings:["Authored identity and routing comparison only; patch areas, loads, and physical load path are unverified."]};
}
