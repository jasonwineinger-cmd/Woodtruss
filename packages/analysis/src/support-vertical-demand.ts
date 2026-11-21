import type {TrussModel} from "./index.js";
import {replayAuthoredCase,type AuthoredCaseReceipt,type AuthoredCaseScope} from "./authored-case-replay.js";
import type {ExplicitNodalLoadChannel} from "./load-source-aggregation.js";

export interface ExpectedSupportDemandScope {
  modelId:string;
  modelRevision:string;
  supportNodeIds:readonly string[];
  cases:readonly AuthoredCaseScope[];
}
export interface SupportDemandCaseInput {
  caseId:string;
  receipt:AuthoredCaseReceipt;
  channels:readonly ExplicitNodalLoadChannel[];
}
const text=(value:string)=>typeof value==="string"&&value.length>0&&value.trim()===value;

/** Translate modeled signed vertical reactions into two distinct demand
 * directions. Negative reaction requires an assumed downward restraint on
 * the truss; it neither proves that anchorage exists nor checks its capacity. */
export function auditSupportVerticalDemand(expected:ExpectedSupportDemandScope,model:TrussModel,
  supplied:readonly SupportDemandCaseInput[]) {
  const cases=expected.cases.map(c=>c.caseId);
  if(!text(expected.modelId)||!text(expected.modelRevision)||!cases.length||cases.some(id=>!text(id))||
    new Set(cases).size!==cases.length||supplied.length!==cases.length||supplied.some((row,i)=>row.caseId!==cases[i])||
    expected.cases.some(c=>c.modelId!==expected.modelId||c.modelRevision!==expected.modelRevision))
    throw new Error("Exact ordered authored support-demand cases and model revision required");
  const ids=expected.supportNodeIds;
  if(!ids.length||ids.some(id=>!text(id))||new Set(ids).size!==ids.length||
    ids.some(id=>model.supports.filter(s=>s.nodeId===id&&s.fixY===true).length!==1))
    throw new Error("Exact distinct vertically restrained support nodes required");

  const solved=supplied.map(({receipt,channels},i)=>replayAuthoredCase(receipt,expected.cases[i],model,channels));
  const rows=ids.map(nodeId=>{
    const perCase=solved.map(record=>{
      const reactions=record.case.result.reactionLb;
      const reactionYLb=Object.hasOwn(reactions,nodeId)?reactions[nodeId]?.y:undefined;
      if(typeof reactionYLb!=="number"||!Number.isFinite(reactionYLb))
        throw new Error("Missing signed modeled vertical reaction: "+nodeId);
      return {sourceScope:record.receipt.scope,sourceChannels:record.receipt.contributions,
        signedReactionYLb:reactionYLb,bearingCompressionLb:Math.max(0,reactionYLb),
        holdDownTensionLb:Math.max(0,-reactionYLb)};
    });
    const bearingCompressionLb=Math.max(...perCase.map(row=>row.bearingCompressionLb));
    const holdDownTensionLb=Math.max(...perCase.map(row=>row.holdDownTensionLb));
    return {nodeId,perCase,bearingCompressionLb,holdDownTensionLb,
      governingBearingCases:perCase.filter(row=>bearingCompressionLb>0&&row.bearingCompressionLb===bearingCompressionLb)
        .map(row=>row.sourceScope.caseId),
      governingHoldDownCases:perCase.filter(row=>holdDownTensionLb>0&&row.holdDownTensionLb===holdDownTensionLb)
        .map(row=>row.sourceScope.caseId)};
  });
  return {modelId:expected.modelId,modelRevision:expected.modelRevision,caseIds:cases,supports:rows,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    contactVerified:false as const,anchorageVerified:false as const,capacityVerified:false as const,
    manufacturingApproved:false as const,
    warnings:["Positive modeled Y reaction is compression demand; negative reaction indicates required hold-down restraint.",
      "No unilateral contact, uplift redistribution, connection design, code combinations, or release is verified."]};
}
