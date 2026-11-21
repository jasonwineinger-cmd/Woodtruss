import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';
import {createPreliminaryReviewChecklist} from '../dist/fabrication/src/preliminary-review-checklist.js';
import {createPreliminaryReviewReceipt,preparePreliminaryReviewReceipt} from '../dist/fabrication/src/preliminary-review-receipt.js';
import {planPreliminaryReviewInvalidation} from '../dist/fabrication/src/preliminary-review-invalidation.js';

async function view(revisionId,b,c,designId) {
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120*b,y:48*b},{id:'C',x:240*c,y:0}],
    bars:[{id:'AB',a:'A',b:'B'},{id:'AC',a:'A',b:'C'}]};
  const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  return {evidence,savedSchematic:await createPreliminarySchematicReview(evidence)};
}
async function review(target='r2',b=2,c=2,designId='design') {
  const from=await view('r1',1,1,designId),to=await view(target,b,c,designId);
  const evidence={from,to,checklist:await createPreliminaryReviewChecklist(from,to)};
  const prompt=await preparePreliminaryReviewReceipt(evidence);
  const claim={useScope:prompt.useScope,checklistSha256:prompt.checklistSha256,acknowledgedChecks:prompt.checks.slice(0,1)};
  return {evidence,prompt,claim,receipt:await createPreliminaryReviewReceipt(evidence,claim)};
}

test('same IDs carrying a prior acknowledgment still require re-ack on any new target revision',async()=>{
  const prior=await review(),next=await review('r3');
  const result=await planPreliminaryReviewInvalidation(prior.receipt,prior.evidence,prior.claim,next.evidence);
  assert.equal(result.priorTargetRevisionId,'r2');
  assert.equal(result.nextTargetRevisionId,'r3');
  assert.notEqual(result.priorChecklistSha256,result.nextChecklistSha256);
  assert.deepEqual(result.pendingChecks,[
    {code:'CHANGED_JOINT_IDS',ids:['B','C'],reason:'SAME_IDS_REACK_REQUIRED'},
    {code:'CHANGED_MEMBER_IDS',ids:['AB','AC'],reason:'NEW_OR_PREVIOUSLY_PENDING'},
    {code:'VIEW_MASKS_MODEL_CHANGE',ids:[],reason:'NEW_OR_PREVIOUSLY_PENDING'},
  ]);
  assert.equal(result.acknowledgmentCarryForward,false);
  assert.equal(result.engineeringSignoffVerified,false);
  assert.equal(result.fabricationAuthorized,false);
  assert.throws(()=>{result.pendingChecks[0].ids.push('spoof');},TypeError);
});

test('a changed affected set reopens review, and an unchanged target model still grants no approval',async()=>{
  const prior=await review(),next=await review('r3',2,1);
  const result=await planPreliminaryReviewInvalidation(prior.receipt,prior.evidence,prior.claim,next.evidence);
  assert.deepEqual(result.pendingChecks[0],{code:'CHANGED_JOINT_IDS',ids:['B'],reason:'CHANGED_IDS_REVIEW_REQUIRED'});
  const same=await review('same',1,1);
  const unchanged=await planPreliminaryReviewInvalidation(prior.receipt,prior.evidence,prior.claim,same.evidence);
  assert.deepEqual(unchanged.pendingChecks,[]);
  assert.equal(unchanged.acknowledgmentCarryForward,false);
  assert.equal(unchanged.fabricationAuthorized,false);
});

test('rejects reused revision labels, cross-design contexts, and spoofed source or prior receipt',async()=>{
  const prior=await review(),next=await review('r3');
  await assert.rejects(planPreliminaryReviewInvalidation(prior.receipt,prior.evidence,prior.claim,prior.evidence),/different target/);
  await assert.rejects(planPreliminaryReviewInvalidation(prior.receipt,prior.evidence,prior.claim,(await review('r3',2,2,'other')).evidence),/across designs/);
  await assert.rejects(planPreliminaryReviewInvalidation({...prior.receipt,engineeringSignoffVerified:true},prior.evidence,prior.claim,next.evidence),/acknowledged preliminary/);
  await assert.rejects(planPreliminaryReviewInvalidation(prior.receipt,prior.evidence,prior.claim,{...next.evidence,checklist:prior.evidence.checklist}),/verified preliminary review evidence/);
});
