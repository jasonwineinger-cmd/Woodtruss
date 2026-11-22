import type {TrussModel} from "./index.js";
import {replayAuthoredRelativeJointY,type ExpectedAuthoredServiceability,type ServiceabilityCaseInput} from "./authored-serviceability-replay.js";

export interface ExpectedServiceabilityRevisionComparison {
  before:ExpectedAuthoredServiceability;
  after:ExpectedAuthoredServiceability;
  /** An independently reviewed one-to-one mapping, not inferred by names. */
  pairs:readonly {beforeCaseId:string;afterCaseId:string}[];
}
export interface RevisionServiceabilityInput {
  model:TrussModel;
  cases:readonly ServiceabilityCaseInput[];
}

function layout(model:TrussModel) {
  return [
    model.nodes.map(n=>[n.id,n.x,n.y]),
    model.bars.map(b=>[b.id,b.a,b.b]),
    model.supports.map(s=>[s.nodeId,s.fixX,s.fixY]),
  ];
}

/** Replay both exact revisions and show separately sourced movements. Report
 * a signed delta only when node/datum identity and modeled layout agree.
 * Stiffness and authored loads can intentionally differ across the revisions. */
export function compareAuthoredServiceabilityRevisions(expected:ExpectedServiceabilityRevisionComparison,
  before:RevisionServiceabilityInput,after:RevisionServiceabilityInput) {
  const a=expected.before,b=expected.after;
  if(a.modelId===b.modelId&&a.modelRevision===b.modelRevision)
    throw new Error("Two distinct expected serviceability model revisions required");
  const beforeIds=new Set(a.cases.map(c=>c.caseId)),afterIds=new Set(b.cases.map(c=>c.caseId));
  if(!expected.pairs.length||expected.pairs.length!==beforeIds.size||expected.pairs.length!==afterIds.size||
     new Set(expected.pairs.map(p=>p.beforeCaseId)).size!==beforeIds.size||
     new Set(expected.pairs.map(p=>p.afterCaseId)).size!==afterIds.size||
     expected.pairs.some(p=>!beforeIds.has(p.beforeCaseId)||!afterIds.has(p.afterCaseId)))
    throw new Error("Explicit one-to-one serviceability case pairs must cover both revisions");
  const x=replayAuthoredRelativeJointY(a,before.model,before.cases);
  const y=replayAuthoredRelativeJointY(b,after.model,after.cases);
  const layoutMatched=a.modelId===b.modelId&&
    a.datum.nodeId===b.datum.nodeId&&a.datum.leftBearingNodeId===b.datum.leftBearingNodeId&&
    a.datum.rightBearingNodeId===b.datum.rightBearingNodeId&&
    JSON.stringify(layout(before.model))===JSON.stringify(layout(after.model));
  const pairs=expected.pairs.map(({beforeCaseId,afterCaseId})=>{
    const earlier=x.observations.find(row=>row.caseId===beforeCaseId)!;
    const later=y.observations.find(row=>row.caseId===afterCaseId)!;
    const signedDeltaYIn=layoutMatched?later.relativeYIn-earlier.relativeYIn:null;
    if(signedDeltaYIn!==null&&!Number.isFinite(signedDeltaYIn))throw new Error("Signed movement change is nonfinite");
    return {before:earlier,after:later,signedDeltaYIn};
  });
  return {before:{modelId:x.modelId,modelRevision:x.modelRevision,nodeId:x.nodeId,
      leftBearingNodeId:x.leftBearingNodeId,rightBearingNodeId:x.rightBearingNodeId},
    after:{modelId:y.modelId,modelRevision:y.modelRevision,nodeId:y.nodeId,
      leftBearingNodeId:y.leftBearingNodeId,rightBearingNodeId:y.rightBearingNodeId},
    pairs,layoutMatched,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    physicalCorrespondenceVerified:false as const,codeDeflectionVerified:false as const,manufacturingApproved:false as const,
    warnings:[layoutMatched
      ?"Signed changes compare matched modeled layout only; stiffness and loads may differ."
      :"Model layout, datum identity or restraint differs; values are separate and no signed change is reported.",
      "No physical correspondence, code deflection or release verified."]};
}
