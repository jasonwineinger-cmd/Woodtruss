import type {TrussModel} from "./index.js";
import {replayAuthoredCase,type AuthoredCaseReceipt,type AuthoredCaseScope} from "./authored-case-replay.js";
import type {ExplicitNodalLoadChannel} from "./load-source-aggregation.js";
import {aggregateOwnedGirderSourcePatches,type ExpectedGirderPatchCase,type GirderSourcePatchReceipt} from "./girder-source-patch-ownership.js";

export interface ExpectedCarriedBearing {
  patchId:string;
  carriedSupportId:string;
  bearingNodeId:string;
  scope:AuthoredCaseScope;
}

export interface CarriedBearingReplayInput extends ExpectedCarriedBearing {
  /** Trusted recorded receipt and independently checked current source inputs. */
  receipt:AuthoredCaseReceipt;
  model:TrussModel;
  channels:readonly ExplicitNodalLoadChannel[];
}

function sameScope(a:AuthoredCaseScope,b:AuthoredCaseScope) {
  return a.caseId===b.caseId&&a.description===b.description&&a.modelId===b.modelId&&a.modelRevision===b.modelRevision;
}
const text=(value:string)=>typeof value==="string"&&value.trim()===value&&value.length>0;

/** Verify the vertical component of an authored carried reaction only.
 * No attachment, area partition, horizontal force transfer or design approval. */
export function verifyCarriedBearingTransfers(girder:Pick<TrussModel,"nodes">,expected:ExpectedGirderPatchCase,
  patches:readonly GirderSourcePatchReceipt[],bindings:readonly ExpectedCarriedBearing[],
  inputs:readonly CarriedBearingReplayInput[]) {
  // Independently expected patch scope, routes and duplicate patch ownership
  // must pass before doing any carried-model solve.
  const owned=aggregateOwnedGirderSourcePatches(girder,expected,patches);
  const carried=owned.patchReceipts.filter(patch=>patch.route.kind==="carried");
  if(!carried.length||bindings.length!==carried.length||inputs.length!==carried.length||
    new Set(bindings.map(binding=>binding.patchId)).size!==bindings.length||
    new Set(inputs.map(input=>input.patchId)).size!==inputs.length)
    throw new Error("Expected exactly one carried bearing binding and replay per carried patch");

  const used=new Set<string>();
  const transfers=carried.map(patch=>{
    const binding=bindings.find(item=>item.patchId===patch.patchId);
    const input=inputs.find(item=>item.patchId===patch.patchId);
    if(!binding||!input||patch.route.kind!=="carried"||
       !text(binding.bearingNodeId)||binding.carriedSupportId!==patch.route.carriedSupportId||
       input.carriedSupportId!==binding.carriedSupportId||input.bearingNodeId!==binding.bearingNodeId||
       !sameScope(input.scope,binding.scope))
      throw new Error("Carried patch replay disagrees with expected case, revision or bearing: "+patch.patchId);
    const key=JSON.stringify([binding.scope.modelId,binding.scope.modelRevision,binding.scope.caseId,binding.bearingNodeId]);
    if(used.has(key))throw new Error("Same full carried bearing reaction assigned to multiple patches");
    used.add(key);
    const verticalSupports=input.model.supports.filter(support=>support.nodeId===binding.bearingNodeId&&support.fixY===true);
    if(verticalSupports.length!==1)throw new Error("Designated carried bearing must be vertically restrained: "+patch.patchId);
    const replay=replayAuthoredCase(input.receipt,binding.scope,input.model,input.channels);
    const reactions=replay.case.result.reactionLb;
    const reaction=Object.hasOwn(reactions,binding.bearingNodeId)?reactions[binding.bearingNodeId]?.y:undefined;
    if(typeof reaction!=="number"||!Number.isFinite(reaction)||patch.fyLb!==-reaction)
      throw new Error("Carried patch force differs from signed vertical action-reaction: "+patch.patchId);
    return {patchId:patch.patchId,carriedSupportId:binding.carriedSupportId,bearingNodeId:binding.bearingNodeId,
      sourceScope:{...binding.scope},sourceChannels:replay.receipt.contributions,
      receiver:{girderId:patch.girderId,nodeId:patch.nodeId,stationIn:patch.stationIn,face:patch.face},
      provenance:patch.provenance,sourceReactionYLb:reaction,receiverForceYLb:patch.fyLb};
  });
  return {...owned,transfers,carriedVerticalReplayMatched:true as const,
    horizontalTransferVerified:false as const,attachmentVerified:false as const,
    warnings:[...owned.warnings,"Vertical modeled action-reaction only; no other force components, bearing adequacy or attachment checked."]};
}
