import type {studyScissorModeledThreeGaugeRestraint} from "./scissor-modeled-three-gauge-restraint-study.js";
import type {studyObservedScissorThreeGaugeStiffness} from "./observed-scissor-three-gauge-study.js";
import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

type GaugePair=Readonly<{observedGaugeId:string;modeledGaugeId:string;nodeId:string;evidenceRef:string}>;
type BearingPair=Readonly<{observedBearingId:string;modeledNodeId:string;evidenceRef:string}>;
type StepPair=Readonly<{stepId:string;caseId:string;evidenceRef:string}>;
export type ScissorMeasurementCorrespondence=Readonly<{
  protocolId:string;
  reviewEvidenceId:string;
  specimenId:string;
  testId:string;
  observedSourceRef:string;
  modelId:string;
  modelRevision:string;
  comparisonState:"restrained";
  gaugePairs:readonly GaugePair[];
  bearingPairs:readonly BearingPair[];
  stepPairs:readonly StepPair[];
  maxReactionDifferenceLb:number;
}>;
const fields=["protocolId","reviewEvidenceId","specimenId","testId","observedSourceRef","modelId","modelRevision",
  "comparisonState","gaugePairs","bearingPairs","stepPairs","maxReactionDifferenceLb"] as const;
const expectedGaugeNodes=["Q1","R","Q3"] as const;
const expectedBearingNodes=["L","E"] as const;
const exact=<K extends string>(value:unknown,keys:readonly K[]):value is Record<K,unknown>=>
  !!value&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const id=(value:unknown):value is string=>typeof value==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);
const ref=(value:unknown):value is string=>typeof value==="string"&&!!value.trim()&&value.length<=1000;
const fail=(message:string)=>new Error(`Scissor measurement correspondence: ${message}`);

/** Bind a caller-declared one-to-one protocol to exact modeled and observed
 * results. No inferred pairings, evidence authentication, allowable limit
 * or claim of physical equivalence. Order is part of the supplied protocol. */
export function bindScissorMeasurementCorrespondence(
  scope:unknown,
  modeled:ReturnType<typeof studyScissorModeledThreeGaugeRestraint>,
  observed:ReturnType<typeof studyObservedScissorThreeGaugeStiffness>,
):ScissorMeasurementCorrespondence {
  const data=snapshotElasticFrameReviewData(scope);
  if(!exact(data,fields))throw fail("exact review protocol and pair fields required");
  const {protocolId,reviewEvidenceId,specimenId,testId,observedSourceRef,modelId,modelRevision,
    comparisonState,gaugePairs,bearingPairs,stepPairs,maxReactionDifferenceLb}=data;
  if(!id(protocolId)||!id(reviewEvidenceId)||specimenId!==observed.specimenId||testId!==observed.testId||
    !ref(observedSourceRef)||observedSourceRef!==observed.sourceRef||modelId!==modeled.modelId||
    modelRevision!==modeled.modelRevision||comparisonState!=="restrained")
    throw fail("protocol evidence and exact observed/model identities required for restrained comparison");
  if(typeof maxReactionDifferenceLb!=="number"||!Number.isFinite(maxReactionDifferenceLb)||maxReactionDifferenceLb<0)
    throw fail("explicit nonnegative finite reaction-difference tolerance required");
  if(!Array.isArray(gaugePairs)||gaugePairs.length!==3||observed.gaugeIds.length!==3||
    !Array.isArray(bearingPairs)||bearingPairs.length!==2||observed.bearingIds.length!==2||
    !Array.isArray(stepPairs)||stepPairs.length<3||stepPairs.length!==observed.observations.length||
    stepPairs.length!==modeled.rows.length)
    throw fail("three gauge and two bearing pairs and exact coverage of every ordered case and fit-window step required");
  const gauges=expectedGaugeNodes.map((nodeId,index):GaugePair=>{
    const pair:unknown=gaugePairs[index];
    if(!exact(pair,["observedGaugeId","modeledGaugeId","nodeId","evidenceRef"])||
      !id(pair.observedGaugeId)||pair.observedGaugeId!==observed.gaugeIds[index]||!id(pair.modeledGaugeId)||
      pair.nodeId!==nodeId||!ref(pair.evidenceRef)||modeled.rows.some(row=>row.restrained.gauges.length!==3||
        row.restrained.gauges[index].nodeId!==nodeId||row.restrained.gauges[index].gaugeId!==pair.modeledGaugeId))
      throw fail("gauge pairs must match exact observed gauge and ordered modeled gauge/node IDs");
    return Object.freeze({observedGaugeId:pair.observedGaugeId,modeledGaugeId:pair.modeledGaugeId,nodeId,evidenceRef:pair.evidenceRef});
  });
  const bearings=expectedBearingNodes.map((modeledNodeId,index):BearingPair=>{
    const pair:unknown=bearingPairs[index];
    if(!exact(pair,["observedBearingId","modeledNodeId","evidenceRef"])||
      !id(pair.observedBearingId)||pair.observedBearingId!==observed.bearingIds[index]||
      pair.modeledNodeId!==modeledNodeId||!ref(pair.evidenceRef)||
      modeled.rows.some(row=>row.bearingVerticalReactionsLb.length!==2||
        row.bearingVerticalReactionsLb[index].nodeId!==modeledNodeId))
      throw fail("bearing pairs must match exact observed bearing and ordered modeled L/E node IDs");
    return Object.freeze({observedBearingId:pair.observedBearingId,modeledNodeId,evidenceRef:pair.evidenceRef});
  });
  const steps=(stepPairs as unknown[]).map((pair,index):StepPair=>{
    if(!exact(pair,["stepId","caseId","evidenceRef"])||!id(pair.stepId)||!id(pair.caseId)||
      pair.stepId!==observed.observations[index].stepId||pair.caseId!==modeled.rows[index].caseId||!ref(pair.evidenceRef))
      throw fail("step pair must match its exact selected observed step and modeled case in authored order");
    return Object.freeze({stepId:pair.stepId,caseId:pair.caseId,evidenceRef:pair.evidenceRef});
  });
  return Object.freeze({
    protocolId,reviewEvidenceId,specimenId,testId,observedSourceRef,modelId,modelRevision,comparisonState,
    gaugePairs:Object.freeze(gauges),bearingPairs:Object.freeze(bearings),stepPairs:Object.freeze(steps),maxReactionDifferenceLb,
  });
}
