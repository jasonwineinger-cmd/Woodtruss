import type { TrussModel } from "./index.js";
import type { CarriedBearingReplayInput } from "./carried-bearing-transfer.js";
import type { GirderSourcePatchReceipt } from "./girder-source-patch-ownership.js";
import { solveReceivingGirderCase,type ExpectedReceivingGirderCase,type ReceivingGirderCaseScope } from "./receiving-girder-case.js";

export interface ExpectedReceivingReactionCases {
  girderId:string;
  modelRevision:string;
  bearingNodeIds:readonly string[];
  cases:readonly ExpectedReceivingGirderCase[];
}
export interface ReceivingReactionCaseInput {
  receiver:ReceivingGirderCaseScope;
  patches:readonly GirderSourcePatchReceipt[];
  carried:readonly CarriedBearingReplayInput[];
}
const text=(value:string)=>typeof value==="string"&&value.length>0&&value.trim()===value;

/** Envelope vertical modeled bearing reactions from exactly the authored cases.
 * Cases are replayed, not combined, and no automatically generated cases are inferred. */
export function envelopeReceivingGirderReactions(expected:ExpectedReceivingReactionCases,model:TrussModel,
  inputs:readonly ReceivingReactionCaseInput[]) {
  const labels=expected.cases.map(c=>c.receiver.caseId);
  if(!text(expected.girderId)||!text(expected.modelRevision)||!labels.length||
     labels.some(id=>!text(id))||new Set(labels).size!==labels.length||inputs.length!==labels.length||
     expected.cases.some(c=>c.receiver.girderId!==expected.girderId||c.receiver.modelRevision!==expected.modelRevision)||
     inputs.some((entry,i)=>entry.receiver.caseId!==labels[i]))
    throw new Error("Exact ordered receiving reaction case coverage and common revision required");
  const ids=expected.bearingNodeIds;
  if(!ids.length||ids.some(id=>!text(id))||new Set(ids).size!==ids.length||
     ids.some(id=>model.supports.filter(s=>s.nodeId===id&&s.fixY===true).length!==1))
    throw new Error("Expected unique vertically restrained receiving bearings");

  const cases=inputs.map((input,i)=>solveReceivingGirderCase(expected.cases[i],input.receiver,model,input.patches,input.carried));
  const bearings=ids.map(nodeId=>{
    const values=cases.map(({case:solved,receiver,transfer})=>{
      const reaction=Object.hasOwn(solved.result.reactionLb,nodeId)?solved.result.reactionLb[nodeId].y:undefined;
      if(typeof reaction!=="number"||!Number.isFinite(reaction))throw new Error("Missing finite receiving bearing reaction");
      return {caseId:receiver.caseId,reactionYLb:reaction,sourceTransfers:transfer.transfers,patchReceipts:transfer.patchReceipts};
    });
    const minYLb=values.reduce((minimum,v)=>Math.min(minimum,v.reactionYLb),Infinity);
    const maxYLb=values.reduce((maximum,v)=>Math.max(maximum,v.reactionYLb),-Infinity);
    return {nodeId,minYLb,maxYLb,
      governingMin:values.filter(v=>v.reactionYLb===minYLb),
      governingMax:values.filter(v=>v.reactionYLb===maxYLb)};
  });
  return {girderId:expected.girderId,modelRevision:expected.modelRevision,caseIds:[...labels],bearings,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    coupledModelVerified:false as const,capacityVerified:false as const,manufacturingApproved:false as const,
    warnings:["Vertical reaction envelope of separately authored receiver cases only. No governing code cases, combinations or bearing capacities inferred."]};
}
