import type {TrussModel} from "./index.js";
import {analyzeExplicitScenarios} from "./scenarios.js";
import {verifyCarriedBearingTransfers,type CarriedBearingReplayInput,type ExpectedCarriedBearing} from "./carried-bearing-transfer.js";
import type {ExpectedGirderPatchCase,GirderSourcePatchReceipt} from "./girder-source-patch-ownership.js";

export interface ReceivingGirderCaseScope {
  girderId:string;
  modelRevision:string;
  caseId:string;
  description:string;
}
export interface ExpectedReceivingGirderCase {
  receiver:ReceivingGirderCaseScope;
  receiverModel:Pick<TrussModel,"nodes"|"bars"|"supports">;
  patchCase:ExpectedGirderPatchCase;
  /** Explicit per-patch source-case/bearing mappings, not inferred by equal IDs. */
  carriedMappings:readonly ExpectedCarriedBearing[];
}
const keys=["girderId","modelRevision","caseId","description"] as const;
const text=(s:string)=>typeof s==="string"&&s.trim()===s&&s.length>0;

/** Reconcile explicit vertical patch forces before a receiving linear solve.
 * Existing base loads are not used. This is not a coupled structural analysis. */
export function solveReceivingGirderCase(expected:ExpectedReceivingGirderCase, receiver:ReceivingGirderCaseScope,
  receivingModel:TrussModel,patches:readonly GirderSourcePatchReceipt[],carried:readonly CarriedBearingReplayInput[]) {
  if(!keys.every(key=>text(expected.receiver[key])&&expected.receiver[key]===receiver[key])||
     expected.patchCase.girderId!==receiver.girderId||expected.patchCase.caseId!==receiver.caseId)
    throw new Error("Receiving girder case or model revision does not match exact expected mapping");

  const modelValues=(model:ExpectedReceivingGirderCase["receiverModel"])=>[
    model.nodes.map(n=>[n.id,n.x,n.y]),
    model.bars.map(b=>[b.id,b.a,b.b,b.areaIn2,b.elasticModulusPsi]),
    model.supports.map(s=>[s.nodeId,s.fixX,s.fixY]),
  ] as const;
  const wanted=modelValues(expected.receiverModel).flat(2), actual=modelValues(receivingModel).flat(2);
  if(wanted.length!==actual.length||wanted.some((value,i)=>value!==actual[i])||
     expected.receiverModel.nodes.length!==receivingModel.nodes.length||
     expected.receiverModel.bars.length!==receivingModel.bars.length||
     expected.receiverModel.supports.length!==receivingModel.supports.length)
    throw new Error("Receiving model inputs differ from the expected revision");

  const transfer=verifyCarriedBearingTransfers(receivingModel,expected.patchCase,patches,expected.carriedMappings,carried);
  const {cases,warnings,status}=analyzeExplicitScenarios(receivingModel,[
    {id:receiver.caseId,description:receiver.description,jointLoads:transfer.jointLoads},
  ]);
  return {receiver:{...receiver},case:cases[0],transfer,status,
    warnings:[...warnings,...transfer.warnings,
      "Separate source and receiver models; only explicitly verified vertical patch actions are sent to the receiving solve."],
    coupledModelVerified:false as const,horizontalTransferVerified:false as const,
    attachmentVerified:false as const,manufacturingApproved:false as const};
}
