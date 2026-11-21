import type {TrussModel} from "./index.js";
import {assertAuditedTrussModel} from "./model-audit.js";
import {aggregateExplicitNodalLoadChannels,type ExplicitNodalLoadChannel} from "./load-source-aggregation.js";
import {analyzeExplicitScenarios} from "./scenarios.js";

export interface AuthoredCaseScope {
  caseId:string;
  description:string;
  modelId:string;
  modelRevision:string;
}
const scopeKeys=["caseId","description","modelId","modelRevision"] as const;
const label=(value:string)=>typeof value==="string"&&value.trim()===value&&value.length>0;

/** Produce a deterministic comparison ledger, not a signature. Persist and
 * retrieve it from an independently trusted revision store before replay.
 * Existing base loads are not included in the authored case. */
export function captureAuthoredCase(scope:AuthoredCaseScope,model:TrussModel,channels:readonly ExplicitNodalLoadChannel[]) {
  if(!scopeKeys.every(key=>label(scope[key])))throw new Error("Exact authored case and model revision scope required");
  if(model.supports.some(s=>typeof s.fixX!=="boolean"||typeof s.fixY!=="boolean"))
    throw new Error("Explicit support flags required");

  const {jointLoads,contributions}=aggregateExplicitNodalLoadChannels(model,channels);
  const scopedModel={
    nodes:model.nodes.map(({id,x,y})=>({id,x,y})),
    bars:model.bars.map(({id,a,b,areaIn2,elasticModulusPsi})=>({id,a,b,areaIn2,elasticModulusPsi})),
    supports:model.supports.map(({nodeId,fixX,fixY})=>({nodeId,fixX,fixY})),
  };
  assertAuditedTrussModel({...scopedModel,loads:jointLoads});
  return {
    kind:"authored-case-receipt/v1" as const,
    scope:{caseId:scope.caseId,description:scope.description,modelId:scope.modelId,modelRevision:scope.modelRevision},
    model:scopedModel,
    contributions,
    jointLoads,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    manufacturingApproved:false as const,
  };
}
export type AuthoredCaseReceipt=ReturnType<typeof captureAuthoredCase>;

/** Compare exact ordered values before solving the recomputed explicit case.
 * A mismatch or equilibrium failure throws and does not return a result. */
export function replayAuthoredCase(receipt:AuthoredCaseReceipt,expected:AuthoredCaseScope,
  model:TrussModel,channels:readonly ExplicitNodalLoadChannel[]) {
  if(receipt.kind!=="authored-case-receipt/v1"||receipt.status!=="PRELIMINARY_NOT_ENGINEERED"||
     receipt.manufacturingApproved!==false||scopeKeys.some(key=>receipt.scope[key]!==expected[key]))
    throw new Error("Authored case receipt has stale or unrecognized scope");
  const current=captureAuthoredCase(expected,model,channels);
  const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
  if(!same(receipt.model,current.model))throw new Error("Authored case model inputs changed");
  if(!same(receipt.contributions,current.contributions))throw new Error("Authored case signed channel inputs changed");
  if(!same(receipt.jointLoads,current.jointLoads))throw new Error("Authored case receipt totals differ from replay");

  const solved=analyzeExplicitScenarios({...current.model,loads:[]},[
    {id:expected.caseId,description:expected.description,jointLoads:current.jointLoads},
  ]);
  return {receipt:current,case:solved.cases[0],
    status:solved.status,warnings:solved.warnings,
    manufacturingApproved:false as const};
}
