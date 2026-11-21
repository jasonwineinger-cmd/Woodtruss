import type {TrussModel} from "./index.js";
import type {ExplicitNodalLoadChannel} from "./load-source-aggregation.js";
import {replayAuthoredCase,type AuthoredCaseReceipt,type AuthoredCaseScope} from "./authored-case-replay.js";
import {relativeJointYMovement,type RelativeYObservation} from "./relative-joint-serviceability.js";

export interface ExpectedAuthoredServiceability {
  modelId:string;
  modelRevision:string;
  cases:readonly AuthoredCaseScope[];
  /** Reviewed observation and bearing node selections, never taken from results. */
  datum:Omit<RelativeYObservation,"expectedCaseIds">;
}
export interface ServiceabilityCaseInput {
  caseId:string;
  receipt:AuthoredCaseReceipt;
  channels:readonly ExplicitNodalLoadChannel[];
}
const label=(value:string)=>typeof value==="string"&&value.trim()===value&&value.length>0;

/** Replay trusted authored receipts against independently expected scope and
 * the current exact model. Caller-supplied solver results are never used. */
export function replayAuthoredRelativeJointY(expected:ExpectedAuthoredServiceability,model:TrussModel,
  supplied:readonly ServiceabilityCaseInput[]) {
  const caseIds=expected.cases.map(c=>c.caseId);
  if(!label(expected.modelId)||!label(expected.modelRevision)||!caseIds.length||
    caseIds.some(id=>!label(id))||new Set(caseIds).size!==caseIds.length||
    supplied.length!==caseIds.length||supplied.some((entry,i)=>entry.caseId!==caseIds[i])||
    expected.cases.some(c=>c.modelId!==expected.modelId||c.modelRevision!==expected.modelRevision))
    throw new Error("Exact ordered authored serviceability cases and model revision required");

  const records=supplied.map((row,i)=>replayAuthoredCase(row.receipt,expected.cases[i],model,row.channels));
  const {observations,...comparison}=relativeJointYMovement(records.map(record=>record.case),
    {...expected.datum,expectedCaseIds:caseIds});
  return {...comparison,modelId:expected.modelId,modelRevision:expected.modelRevision,
    observations:observations.map((row,i)=>({...row,
      sourceScope:records[i].receipt.scope,sourceChannels:records[i].receipt.contributions})),
    codeDeflectionVerified:false as const};
}
